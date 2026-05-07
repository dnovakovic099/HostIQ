import api from './client';

/**
 * Fetch the routed recent issues for an inspection.
 *
 * Server returns:
 *   {
 *     per_room: { [roomId]: WatchForItem[] },
 *     property_wide: WatchForItem[],
 *     required_slots: { external_issue_id, room_id|null, category, description }[],
 *     acknowledgments: IssueAcknowledgment[],
 *     missing_count: number,
 *     missing_slots: { external_issue_id, room_id|null, ... }[]
 *   }
 */
export async function fetchRecentIssues(inspectionId) {
  const res = await api.get(`/cleaner/inspections/${inspectionId}/recent-issues`);
  return res.data;
}

/**
 * Upsert one acknowledgment.
 * @param {string} inspectionId
 * @param {{
 *   external_issue_id: string,
 *   room_id: string|null,
 *   status: 'ADDRESSED'|'STILL_PRESENT'|'NOT_APPLICABLE',
 *   note?: string|null,
 *   description: string,
 *   category?: string|null,
 * }} payload
 * @returns {Promise<{ acknowledgment: object }>}
 */
export async function saveIssueAcknowledgment(inspectionId, payload) {
  const res = await api.post(
    `/cleaner/inspections/${inspectionId}/issue-acknowledgments`,
    payload
  );
  return res.data;
}

/**
 * Upload an optional photo for an existing acknowledgment. Replaces any
 * prior photo on that ack.
 */
export async function uploadAcknowledgmentPhoto(inspectionId, ackId, photoUri) {
  const formData = new FormData();
  formData.append('photo', {
    uri: photoUri,
    type: 'image/jpeg',
    name: `issue_ack_${ackId}.jpg`,
  });

  const res = await api.post(
    `/cleaner/inspections/${inspectionId}/issue-acknowledgments/${ackId}/photo`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
}
