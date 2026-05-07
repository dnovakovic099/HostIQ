import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  saveIssueAcknowledgment,
  uploadAcknowledgmentPhoto,
} from '../api/issueAcknowledgments';
import { API_URL } from '../config/api';
import IssueDetailModal from './IssueDetailModal';

/**
 * One acknowledgment card for a single recent issue.
 *
 * Props:
 *   inspectionId: string
 *   roomId:       string | null     // null = property-wide
 *   item:         WatchForItem      // from brief.watch_for
 *   existingAck:  IssueAcknowledgment | null
 *   onChange:     (ack) => void     // fires after save / photo upload
 */
export default function IssueAckCard({
  inspectionId,
  roomId,
  item,
  existingAck,
  onChange,
}) {
  const [status, setStatus] = useState(existingAck?.status || null);
  const [note, setNote] = useState(existingAck?.note || '');
  const [photoUri, setPhotoUri] = useState(
    existingAck?.photo_url ? resolveUrl(existingAck.photo_url) : null
  );
  const [ackId, setAckId] = useState(existingAck?.id || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    setStatus(existingAck?.status || null);
    setNote(existingAck?.note || '');
    setPhotoUri(existingAck?.photo_url ? resolveUrl(existingAck.photo_url) : null);
    setAckId(existingAck?.id || null);
  }, [existingAck?.id]);

  const persist = async (nextStatus, nextNote = note) => {
    setSaving(true);
    try {
      const payload = {
        external_issue_id: item.key,
        room_id: roomId,
        status: nextStatus,
        note: nextNote,
        description: item.description || item.category || 'Reported issue',
        category: item.category || null,
      };
      const { acknowledgment } = await saveIssueAcknowledgment(inspectionId, payload);
      setAckId(acknowledgment.id);
      onChange?.(acknowledgment);
    } catch (err) {
      console.error('Failed to save ack', err);
      Alert.alert('Error', 'Could not save your response. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (next) => {
    setStatus(next);
    await persist(next, note);
  };

  const handleNoteBlur = async () => {
    if (!status) return; // don't save until status is picked
    await persist(status, note);
  };

  const handleAddPhoto = async () => {
    if (!ackId) {
      Alert.alert('Pick a status first', 'Mark the issue Addressed / Still Present / N/A before adding a photo.');
      return;
    }
    const { status: perm } = await ImagePicker.requestCameraPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert('Camera Permission', 'Camera access is required to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 960 } }],
        { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG }
      );
      const { acknowledgment } = await uploadAcknowledgmentPhoto(
        inspectionId,
        ackId,
        resized.uri
      );
      setPhotoUri(resolveUrl(acknowledgment.photo_url));
      onChange?.(acknowledgment);
    } catch (err) {
      console.error('Photo upload failed', err);
      Alert.alert('Upload Failed', 'Could not upload photo. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const isReview = item.type === 'review';
  const photoExpected = item.photo_required === true;

  return (
    <View style={[styles.card, status && styles[`card_${status}`]]}>
      <TouchableOpacity
        style={styles.headerRow}
        activeOpacity={0.7}
        onPress={() => setDetailVisible(true)}
      >
        <View style={styles.iconWrap}>
          <Ionicons
            name={isReview ? 'star-outline' : 'alert-circle-outline'}
            size={18}
            color={isReview ? '#8B5CF6' : '#EF4444'}
          />
        </View>
        <View style={{ flex: 1 }}>
          {item.category && (
            <Text style={styles.category}>{item.category}</Text>
          )}
          <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
          {item.is_recurring && (
            <Text style={styles.recurring}>
              Recurring · {item.recurring_count}× recently
            </Text>
          )}
          {!item.is_recurring && item.category_recurrence && item.category_recurrence.count > 0 ? (
            <Text style={styles.categoryContext}>
              Note: {item.category_recurrence.category} reported{' '}
              {item.category_recurrence.count}× in last{' '}
              {item.category_recurrence.window_days}d (category, not this issue)
            </Text>
          ) : null}
          {item.guest_name && item.rating != null && (
            <Text style={styles.meta}>
              {item.guest_name} · {item.rating}/5
            </Text>
          )}
          <Text style={styles.detailHint}>Tap for full details ›</Text>
        </View>
      </TouchableOpacity>

      <IssueDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        item={item}
      />

      <View style={styles.actionRow}>
        <StatusButton
          label="Addressed"
          icon="checkmark-circle"
          color="#10B981"
          active={status === 'ADDRESSED'}
          onPress={() => handleStatus('ADDRESSED')}
          disabled={saving}
        />
        <StatusButton
          label="Still Present"
          icon="alert-circle"
          color="#EF4444"
          active={status === 'STILL_PRESENT'}
          onPress={() => handleStatus('STILL_PRESENT')}
          disabled={saving}
        />
        <StatusButton
          label="N/A"
          icon="remove-circle-outline"
          color="#6B7280"
          active={status === 'NOT_APPLICABLE'}
          onPress={() => handleStatus('NOT_APPLICABLE')}
          disabled={saving}
        />
      </View>

      {!!status && status !== 'NOT_APPLICABLE' && (
        <TextInput
          style={styles.noteInput}
          placeholder={
            status === 'ADDRESSED'
              ? 'How did you address it? (optional)'
              : 'What did you find? (optional)'
          }
          placeholderTextColor="#94A3B8"
          value={note}
          onChangeText={setNote}
          onBlur={handleNoteBlur}
          multiline
        />
      )}

      {/* Photo control is always visible so cleaners discover it. For
          photo-friendly items (broken handle, leak, stain, etc.) we
          show a "recommended" hint; for intangibles (smell, pest,
          noise) the hint stays neutral. */}
      {(!!status && status !== 'NOT_APPLICABLE') || photoExpected ? (
        <View style={styles.photoRow}>
          {photoUri ? (
            <View style={styles.thumbWrap}>
              <Image source={{ uri: photoUri }} style={styles.thumb} />
              <TouchableOpacity
                style={styles.replaceBtn}
                onPress={handleAddPhoto}
                disabled={uploading}
              >
                <Text style={styles.replaceText}>
                  {uploading ? 'Uploading…' : 'Replace photo'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.addPhotoBtn,
                photoExpected && styles.addPhotoBtnRecommended,
              ]}
              onPress={handleAddPhoto}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#215EEA" />
              ) : (
                <>
                  <Ionicons
                    name="camera-outline"
                    size={16}
                    color={photoExpected ? '#B45309' : '#215EEA'}
                  />
                  <Text
                    style={[
                      styles.addPhotoText,
                      photoExpected && styles.addPhotoTextRecommended,
                    ]}
                  >
                    {photoExpected
                      ? 'Add photo (recommended — boosts your score)'
                      : 'Add photo (optional)'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {photoExpected && status === 'STILL_PRESENT' && !photoUri && (
            <Text style={styles.photoHint}>
              A photo helps prove the issue is real and prevents score
              deductions for unverified reports.
            </Text>
          )}
        </View>
      ) : null}

      {saving && (
        <View style={styles.savingBadge}>
          <ActivityIndicator size="small" color="#6B7280" />
          <Text style={styles.savingText}>Saving…</Text>
        </View>
      )}
    </View>
  );
}

function StatusButton({ label, icon, color, active, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[
        styles.statusBtn,
        active && { backgroundColor: color, borderColor: color },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? '#FFF' : color}
      />
      <Text
        style={[
          styles.statusBtnText,
          { color: active ? '#FFF' : color },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('file://')) return url;
  const base = API_URL.replace('/api', '');
  return url.startsWith('/') ? base + url : base + '/' + url;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  card_ADDRESSED: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  card_STILL_PRESENT: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  card_NOT_APPLICABLE: {
    borderColor: '#9CA3AF',
    backgroundColor: '#F9FAFB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    lineHeight: 19,
  },
  recurring: {
    marginTop: 4,
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  categoryContext: {
    marginTop: 4,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  detailHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteInput: {
    marginTop: 10,
    minHeight: 56,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    fontSize: 13,
    color: '#1F2937',
    textAlignVertical: 'top',
  },
  photoRow: {
    marginTop: 10,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
  },
  addPhotoBtnRecommended: {
    borderColor: '#FBBF24',
    backgroundColor: '#FFFBEB',
    borderStyle: 'solid',
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#215EEA',
    flexShrink: 1,
    textAlign: 'center',
  },
  addPhotoTextRecommended: {
    color: '#B45309',
  },
  photoHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#92400E',
    fontStyle: 'italic',
    paddingHorizontal: 4,
    lineHeight: 15,
  },
  thumbWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  replaceBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  replaceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#215EEA',
  },
  savingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  savingText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
