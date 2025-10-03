import React from 'react';

/**
 * Ocean Professional theme tokens for the Tier Selection modal.
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

// PUBLIC_INTERFACE
export default function TierSelectionModal({ open, onClose, onSelect }) {
  /**
   * A dedicated modal/popup for selecting a plan tier.
   * Sections: Free Tier, $10 Tier, $100 Tier. Each with features and a call-to-action button.
   *
   * Props:
   * - open: boolean - whether the modal is open
   * - onClose: function - called when the modal should close
   * - onSelect: function(tierId: 'free' | '10' | '100') - called when a user selects a tier
   */
  if (!open) return null;

  const handle = (tierId) => {
    if (typeof onSelect === 'function') onSelect(tierId);
    // Close after selection by default
    onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tier-modal-title"
      aria-describedby="tier-modal-desc"
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 id="tier-modal-title" style={styles.title}>
            Choose Your Tier
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            style={styles.iconButton}
          >
            ×
          </button>
        </div>
        <p id="tier-modal-desc" style={styles.subtitle}>
          Pick the plan that suits your play style. Upgrade anytime. Benefits are highlighted below.
        </p>

        <div style={styles.grid}>
          <TierCard
            highlight={false}
            name="Free Tier"
            price="$0"
            period="/mo"
            ribbon="Starter"
            benefitBadges={[
              { label: '20% Wager Tax', tone: 'warning' },
              { label: '5% Deposit Bonus', tone: 'info' },
              { label: 'Free $1/week', tone: 'success' },
            ]}
            features={[
              'Browse player profiles',
              'Connect Ethereum wallet',
              'Initiate casual matches',
            ]}
            cta="Start Free"
            onClick={() => handle('free')}
          />

          <TierCard
            highlight
            name="$10 Tier"
            price="$10"
            period="/mo"
            ribbon="Popular"
            benefitBadges={[
              { label: '2.5% Wager Tax', tone: 'success' },
              { label: '15% Deposit Bonus', tone: 'info' },
              { label: 'Free $5 / $100 deposit', tone: 'success' },
            ]}
            features={[
              'Priority matchmaking',
              'Enhanced profile visibility',
              'Deposit monitoring alerts',
              'Standard support',
            ]}
            cta="Select $10 Tier"
            onClick={() => handle('10')}
          />

          <TierCard
            highlight={false}
            name="$100 Tier"
            price="$100"
            period="/mo"
            ribbon="Pro"
            benefitBadges={[
              { label: '30% Deposit Bonus', tone: 'info' },
              { label: 'Free $30/month in wagers', tone: 'success' },
              { label: '0% Wager Tax', tone: 'primary' },
            ]}
            features={[
              'Premium matchmaking lanes',
              'Pro verification badge',
              'Dedicated support channel',
              'Advanced analytics (beta)',
            ]}
            cta="Select $100 Tier"
            onClick={() => handle('100')}
          />
        </div>

        <div style={styles.footerNote}>
          By continuing, you agree to our Terms. You can manage your subscription from your account settings.
        </div>
      </div>
    </div>
  );
}

function BenefitBadge({ label, tone = 'info' }) {
  const palette = {
    info: { bg: '#EEF2FF', border: `${theme.primary}33`, color: theme.primary },
    success: { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46' },
    warning: { bg: '#FFFBEB', border: '#F59E0B66', color: '#92400E' },
    primary: { bg: '#DBEAFE', border: '#93C5FD', color: '#1E3A8A' },
  };
  const p = palette[tone] || palette.info;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 999,
        border: `1px solid ${p.border}`,
        background: p.bg,
        color: p.color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">🏷️</span>
      {label}
    </span>
  );
}

function TierCard({
  name,
  price,
  period,
  features = [],
  cta,
  onClick,
  highlight = false,
  ribbon,
  benefitBadges = [],
}) {
  return (
    <div style={{ ...styles.card, ...(highlight ? styles.cardHighlight : {}) }}>
      {ribbon ? (
        <div style={styles.ribbon} aria-hidden="true">
          {ribbon}
        </div>
      ) : null}

      <div style={styles.cardHeader}>
        <div style={styles.cardName}>{name}</div>
        <div style={styles.priceRow}>
          <span style={styles.price}>{price}</span>
          <span style={styles.period}>{period}</span>
        </div>
      </div>

      {benefitBadges.length > 0 && (
        <div style={styles.benefitsRow} aria-label={`${name} benefits`}>
          {benefitBadges.map((b, idx) => (
            <BenefitBadge key={idx} label={b.label} tone={b.tone} />
          ))}
        </div>
      )}

      <ul style={styles.features} aria-label={`${name} features`}>
        {features.map((f, i) => (
          <li key={i} style={styles.featureItem}>
            <span aria-hidden="true" style={styles.check}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onClick}
        style={{ ...styles.ctaButton, ...(highlight ? styles.ctaPrimary : {}) }}
        aria-label={`Select ${name}`}
      >
        {cta}
      </button>
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
    maxWidth: 980,
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
    fontWeight: 800,
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 16,
  },
  card: {
    position: 'relative',
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
    minHeight: 280,
  },
  cardHighlight: {
    background: 'linear-gradient(180deg, rgba(37,99,235,0.06), #ffffff)',
    border: `1px solid ${theme.primary}33`,
  },
  ribbon: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontSize: 12,
    fontWeight: 800,
    color: theme.primary,
    background: '#EEF2FF',
    border: `1px solid ${theme.primary}33`,
    borderRadius: 999,
    padding: '2px 8px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 800,
    color: theme.text,
  },
  priceRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
  },
  price: {
    fontSize: 22,
    fontWeight: 900,
    color: theme.text,
  },
  period: {
    fontSize: 12,
    color: theme.muted,
    marginBottom: 2,
  },
  benefitsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -2,
  },
  features: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flexGrow: 1,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    color: theme.text,
    fontSize: 14,
  },
  check: {
    color: theme.primary,
    fontWeight: 900,
    marginTop: 1,
  },
  ctaButton: {
    alignSelf: 'stretch',
    background: '#F3F4F6',
    color: '#111827',
    border: '1px solid #E5E7EB',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
    textAlign: 'center',
  },
  ctaPrimary: {
    background: theme.primary,
    color: '#ffffff',
    border: '1px solid transparent',
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
  },
  footerNote: {
    marginTop: 12,
    fontSize: 12,
    color: theme.muted,
    textAlign: 'center',
  },
};
