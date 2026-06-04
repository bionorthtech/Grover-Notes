export const APP_STORAGE_KEYS = {
  theme: 'grover-theme',
  zoom: 'grover:zoom-level',
  viewMode: 'grover-view-mode',
  tagColors: 'grover:tag-color-overrides',
  statusColors: 'grover:status-color-overrides',
  propertyModes: 'grover:display-mode-overrides',
  configMigrationFlag: 'grover:config-migrated-to-vault',
  legacyMigrationFlag: 'grover:legacy-storage-migrated',
  sortPreferences: 'grover-sort-preferences',
  sidebarCollapsed: 'grover:sidebar-collapsed',
  layoutPanels: 'grover:layout-panels',
  welcomeDismissed: 'grover_welcome_dismissed',
} as const

// Legacy keys retain the upstream "tolaria-" prefix so that a user upgrading from
// a prior Tolaria install on the same machine keeps their local settings. New data
// is always written under the grover- keys in APP_STORAGE_KEYS above.
export const LEGACY_APP_STORAGE_KEYS = {
  theme: 'tolaria-theme',
  zoom: 'tolaria:zoom-level',
  viewMode: 'tolaria-view-mode',
  tagColors: 'tolaria:tag-color-overrides',
  statusColors: 'tolaria:status-color-overrides',
  propertyModes: 'tolaria:display-mode-overrides',
  configMigrationFlag: 'tolaria:config-migrated-to-vault',
  sortPreferences: 'tolaria-sort-preferences',
  sidebarCollapsed: 'tolaria:sidebar-collapsed',
  layoutPanels: 'tolaria:layout-panels',
  welcomeDismissed: 'tolaria_welcome_dismissed',
} as const

type MigratableStorageKey = keyof typeof LEGACY_APP_STORAGE_KEYS

const MIGRATABLE_STORAGE_KEYS: MigratableStorageKey[] = [
  'theme',
  'zoom',
  'viewMode',
  'tagColors',
  'statusColors',
  'propertyModes',
  'configMigrationFlag',
  'sortPreferences',
  'sidebarCollapsed',
  'layoutPanels',
  'welcomeDismissed',
]

export function copyLegacyAppStorageKeys(): void {
  try {
    if (localStorage.getItem(APP_STORAGE_KEYS.legacyMigrationFlag) === '1') return

    for (const key of MIGRATABLE_STORAGE_KEYS) {
      const storageKey = Reflect.get(APP_STORAGE_KEYS, key) as string
      const legacyStorageKey = Reflect.get(LEGACY_APP_STORAGE_KEYS, key) as string
      if (localStorage.getItem(storageKey) !== null) continue

      const legacyValue = localStorage.getItem(legacyStorageKey)
      if (legacyValue !== null) {
        localStorage.setItem(storageKey, legacyValue)
      }
    }

    localStorage.setItem(APP_STORAGE_KEYS.legacyMigrationFlag, '1')
  } catch {
    // Ignore unavailable or restricted localStorage implementations.
  }
}

export function getAppStorageItem(key: MigratableStorageKey): string | null {
  try {
    const storageKey = Reflect.get(APP_STORAGE_KEYS, key) as string
    const legacyStorageKey = Reflect.get(LEGACY_APP_STORAGE_KEYS, key) as string
    return localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey)
  } catch {
    return null
  }
}
