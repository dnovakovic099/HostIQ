import { create } from 'zustand';

export const useInspectionStore = create((set, get) => ({
  currentInspection: null,
  uploadedMedia: [],
  isUploading: false,
  uploadProgress: 0,

  createInspection: (inspection) => {
    set({ 
      currentInspection: inspection, 
      uploadedMedia: [] 
    });
  },

  addMedia: (media) => {
    set((state) => ({
      uploadedMedia: [...state.uploadedMedia, media]
    }));
  },

  removeMedia: (mediaId) => {
    set((state) => ({
      uploadedMedia: state.uploadedMedia.filter(m => m.id !== mediaId)
    }));
  },

  clearMedia: () => {
    set({ uploadedMedia: [] });
  },

  setUploadProgress: (progress) => {
    set({ uploadProgress: progress });
  },

  setIsUploading: (isUploading) => {
    set({ isUploading });
  },

  resetInspection: () => {
    set({ 
      currentInspection: null, 
      uploadedMedia: [], 
      isUploading: false,
      uploadProgress: 0
    });
  },
}));








