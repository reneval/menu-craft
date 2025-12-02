import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OrganizationState {
  currentOrgId: string | null;
  currentVenueId: string | null;
  setCurrentOrgId: (orgId: string | null) => void;
  setCurrentVenueId: (venueId: string | null) => void;
}

// For development, use a mock organization ID
const DEV_ORG_ID = '00000000-0000-0000-0000-000000000001';

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      currentOrgId: DEV_ORG_ID,
      currentVenueId: null,
      setCurrentOrgId: (orgId) => set({ currentOrgId: orgId }),
      setCurrentVenueId: (venueId) => set({ currentVenueId: venueId }),
    }),
    {
      name: 'menucraft-org',
    }
  )
);

export function useCurrentOrg() {
  return useOrganizationStore((state) => state.currentOrgId);
}

export function useCurrentVenue() {
  return useOrganizationStore((state) => state.currentVenueId);
}

export function useSetCurrentVenue() {
  return useOrganizationStore((state) => state.setCurrentVenueId);
}
