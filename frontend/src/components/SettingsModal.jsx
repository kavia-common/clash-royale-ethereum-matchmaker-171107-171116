import React from 'react';

/**
 * Ocean Professional theme tokens for the Settings modal.
 */
const theme = {
  primary: '#2563EB',
  secondary: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  muted: '#6B7280',
  overlay: 'rgba(17, 24, 39, 0.55)',
};

/**
 * PUBLIC_INTERFACE
 * SettingsModal
 * A controlled modal for application/user settings. Currently contains placeholder content.
 *
 * Props:
 * - open: boolean - whether the modal is open
 * - onClose: function - called when the modal should close
 */
export default function SettingsModal({ open, onClose }) {
  /** This is a public function. */
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      aria-describedby="settings-modal-desc"
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 id="settings-modal-title" style={styles.title}>
            Settings
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            style={styles.iconButton}
            title="Close settings"
          >
            ×
          </button>
        </div>

        <p id="settings-modal-desc" style={styles.subtitle}>
          Configure your preferences. This placeholder shows the layout and style. Integrate real settings later.
        </p>

        <section aria-label="General Settings" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>General</h3>
            <span style={styles.badge}>Placeholder</span>
          </div>

          <div style={styles.gridTwo}>
            <div style={styles.fieldCard}>
              <div style={styles.fieldLabel}>Theme</div>
              <div style={styles.fieldValue}>System default</div>
              <div style={styles.fieldHint}>Wires to the header theme toggle.</div>
            </div>
            <div style={styles.fieldCard}>
              <div style={styles.fieldLabel}>Currency</div>
              <div style={styles.fieldValue}>ETH</div>
              <div style={styles.fieldHint}>All wagers are denominated in Ethereum.</div>
            </div>
          </div>
        </section>

        <section aria-label="Notifications" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Notifications</h3>
          </div>
          <div style={styles.list}>
            <div style={styles.listRow}>
              <div style={styles.listLeft}>
                <div style={styles.listTitle}>Deposit reminders</div>
                <div style={styles.listSub}>Get notified when an opponent deposits to escrow.</div>
              </div>
              <label style={styles.switchWrap} aria-label="Deposit reminders toggle">
                <input type="checkbox" defaultChecked readOnly />
                <span style={styles.switchFake} />
              </label>
            </div>
            <div style={styles.listRow}>
              <div style={styles.listLeft}>
                <div style={styles.listTitle}>Matchmaking updates</div>
                <div style={styles.listSub}>Status changes for queued or pending matches.</div>
              </div>
              <label style={styles.switchWrap} aria-label="Matchmaking updates toggle">
                <input type="checkbox" defaultChecked={false} readOnly />
                <span style={styles.switchFake} />
              </label>
            </div>
          </div>
        </section>

        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.secondaryButton}>
            Close
          </button>
          <button type="button" onClick={onClose} style={styles.primaryButton} aria-label="Save settings">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: theme.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: 720,
    background: theme.surface,
    color: theme.text,
    borderRadius: 14,
    boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
    padding: 20,
    border: '1px solid #E5E7EB',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
    color: theme.text,
  },
  subtitle: {
    margin: '0 0 14px',
    color: '#374151',
    fontSize: 14,
  },
  iconButton: {
    border: 'none',
    background: 'transparent',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
    color: '#6B7280',
  },
  section: {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: theme.text,
  },
  badge: {
    fontSize: 12,
    fontWeight: 800,
    color: '#2563EB',
    background: '#EEF2FF',
    border: '1px solid #2563EB33',
    padding: '2px 8px',
    borderRadius: 999,
  },
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
  },
  fieldCard: {
    background: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: '#6B7280',
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: 800,
    color: theme.text,
  },
  fieldHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  list: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 8,
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    padding: '10px 12px',
  },
  listLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  listTitle: { fontWeight: 800, color: theme.text, fontSize: 14 },
  listSub: { color: '#6B7280', fontSize: 12 },
  switchWrap: {
    position: 'relative',
    width: 44,
    height: 24,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    cursor: 'not-allowed', // placeholder only
  },
  switchFake: {
    position: 'relative',
    display: 'inline-block',
    width: 44,
    height: 24,
    background: '#E5E7EB',
    borderRadius: 999,
    border: '1px solid #D1D5DB',
  },
  actions: {
    marginTop: 14,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
  secondaryButton: {
    background: '#F3F4F6',
    color: '#111827',
    border: '1px solid #E5E7EB',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
  },
  primaryButton: {
    background: theme.primary,
    color: '#ffffff',
    border: '1px solid transparent',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
  },
};
