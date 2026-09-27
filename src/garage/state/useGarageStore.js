// ─────────────────────────────────────────────────────────────────────────────
// GARAGE STORE (Zustand) — the only shared state between the 3D scene and the
// HTML overlay. Neither side talks to the other directly:
//
//   click in 3D  → store action → overlay re-renders (menus, dashboard)
//   click in UI  → store action → scene reacts (camera flies, mesh swaps)
//
// Rule of thumb: the store holds *intent* (serialisable ids and flags). Three.js
// objects never go in here — the scene resolves ids to meshes itself.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { DEFAULT_GARAGE } from '../config/garagePresets'
import { STOCK } from '../config/partsCatalog'
import { VEHICLES } from '../config/vehicles'
import { createMaintenanceSeed, markServiceDone, mergeMaintenance } from './maintenance'

// Match the app's per-environment storage namespace (see hooks/useGitHubData.js).
const ENV_KEY = import.meta.env.VITE_APP_ENV ?? 'dev'
const STORAGE_KEY = `hcc_${ENV_KEY}_garage`

export const useGarageStore = create(
  persist(
    (set, get) => ({
      // ── Selection & camera ─────────────────────────────────────────────────
      activeVehicleId: VEHICLES[0].id,

      /**
       * What the camera should frame. `nonce` bumps on every request so asking
       * for the same target twice (after the user orbited away) still flies back.
       * kind: 'overview' | 'vehicle' | 'part'
       */
      focus: { kind: 'overview', vehicleId: null, partId: null, nodeIndex: 0, nonce: 0 },

      /** Part under the pointer: { vehicleId, partId, label } | null */
      hovered: null,

      /** Swappable part whose Remove/Upgrade menu is open: { vehicleId, partId } | null */
      selectedPart: null,

      // ── Vehicle state ──────────────────────────────────────────────────────
      /** openParts[vehicleId][partId] = true when a door/hood/trunk is open. */
      openParts: {},

      /** partVariants[vehicleId][partId] = catalog variant id | 'removed'. Absent = stock. */
      partVariants: {},

      /** Set when a .glb failed to load and the placeholder is showing instead. */
      modelErrors: {},

      // ── Garage & maintenance ───────────────────────────────────────────────
      garage: DEFAULT_GARAGE,
      maintenance: createMaintenanceSeed(),
      /** Session-only: alert ids the user closed. */
      dismissedAlerts: {},

      // Dashboard starts open only where there's room for it beside the car.
      ui: { panelOpen: typeof window !== 'undefined' && window.innerWidth >= 1024, customizeOpen: false },

      // ── Actions ────────────────────────────────────────────────────────────
      focusOverview: () =>
        set((s) => ({ focus: { kind: 'overview', vehicleId: null, partId: null, nodeIndex: 0, nonce: s.focus.nonce + 1 } })),

      focusVehicle: (vehicleId) =>
        set((s) => ({
          activeVehicleId: vehicleId,
          selectedPart: null,
          focus: { kind: 'vehicle', vehicleId, partId: null, nodeIndex: 0, nonce: s.focus.nonce + 1 },
        })),

      /** nodeIndex picks which socket to frame for multi-node parts (e.g. which wheel). */
      focusPart: (vehicleId, partId, nodeIndex = 0) =>
        set((s) => ({
          activeVehicleId: vehicleId,
          focus: { kind: 'part', vehicleId, partId, nodeIndex, nonce: s.focus.nonce + 1 },
        })),

      setHovered: (hovered) => {
        const cur = get().hovered
        if (cur?.vehicleId === hovered?.vehicleId && cur?.partId === hovered?.partId) return
        set({ hovered })
      },

      togglePart: (vehicleId, partId) =>
        set((s) => {
          const forVehicle = s.openParts[vehicleId] ?? {}
          return { openParts: { ...s.openParts, [vehicleId]: { ...forVehicle, [partId]: !forVehicle[partId] } } }
        }),

      /** Open or close several articulated parts at once ("open all doors"). */
      setPartsOpen: (vehicleId, partIds, open) =>
        set((s) => {
          const next = { ...(s.openParts[vehicleId] ?? {}) }
          for (const id of partIds) next[id] = open
          return { openParts: { ...s.openParts, [vehicleId]: next } }
        }),

      selectPart: (vehicleId, partId) => set({ selectedPart: { vehicleId, partId }, activeVehicleId: vehicleId }),
      clearSelection: () => set({ selectedPart: null }),

      /** variantId: a catalog id, STOCK, or REMOVED. */
      setVariant: (vehicleId, partId, variantId) =>
        set((s) => {
          const next = { ...(s.partVariants[vehicleId] ?? {}) }
          if (variantId === STOCK) delete next[partId]
          else next[partId] = variantId
          return { partVariants: { ...s.partVariants, [vehicleId]: next } }
        }),

      reportModelError: (vehicleId, message) =>
        set((s) => ({ modelErrors: { ...s.modelErrors, [vehicleId]: message } })),

      updateGarage: (patch) => set((s) => ({ garage: { ...s.garage, ...patch } })),
      toggleLightRig: (rig) =>
        set((s) => ({ garage: { ...s.garage, lights: { ...s.garage.lights, [rig]: !s.garage.lights[rig] } } })),

      setMileage: (vehicleId, mileage) =>
        set((s) => ({
          maintenance: { ...s.maintenance, [vehicleId]: { ...s.maintenance[vehicleId], mileage } },
        })),

      completeService: (vehicleId, serviceId) =>
        set((s) => ({
          maintenance: { ...s.maintenance, [vehicleId]: markServiceDone(s.maintenance[vehicleId], serviceId) },
        })),

      dismissAlert: (alertId) => set((s) => ({ dismissedAlerts: { ...s.dismissedAlerts, [alertId]: true } })),

      setUi: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist customisation and records; selection, hover and camera are per-visit.
      partialize: (s) => ({
        garage: s.garage,
        partVariants: s.partVariants,
        maintenance: s.maintenance,
        activeVehicleId: s.activeVehicleId,
      }),
      merge: (saved, current) => ({
        ...current,
        ...saved,
        garage: { ...current.garage, ...saved?.garage, lights: { ...current.garage.lights, ...saved?.garage?.lights } },
        maintenance: mergeMaintenance(current.maintenance, saved?.maintenance),
        activeVehicleId: VEHICLES.some((v) => v.id === saved?.activeVehicleId) ? saved.activeVehicleId : current.activeVehicleId,
      }),
    },
  ),
)
