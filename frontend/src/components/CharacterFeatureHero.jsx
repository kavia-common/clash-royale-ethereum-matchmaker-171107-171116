import React from 'react';

/**
 * PUBLIC_INTERFACE
 * CharacterFeatureHero
 * A responsive hero section that features the provided character illustration alongside headline, subtitle, and CTAs.
 * Styling is derived from assets/character_feature_hero_design_notes.md and assets/style_guide.md.
 *
 * Props:
 * - title: string - main headline text
 * - subtitle: string - supporting text
 * - primaryCta: { label: string, href?: string, onClick?: function } - primary button
 * - secondaryCta?: { label: string, href?: string, onClick?: function } - secondary button (optional)
 *
 * Behavior:
 * - On desktop (>=1024px), uses 2-column grid with text left and image right.
 * - On mobile (<768px), stacks content with text above image and centers actions.
 */
function CharacterFeatureHero({
  title = 'Lead Your Arena',
  subtitle = 'Assemble your forces and rise to the top with our secure Ethereum-backed matchmaking.',
  primaryCta = { label: 'Play Now', href: '#' },
  secondaryCta = { label: 'Learn More', href: '#' },
}) {
  // Helper to render CTA as <a> or <button>
  const renderCta = (cta, variant = 'primary') => {
    if (!cta || !cta.label) return null;
    const className = `cfh-btn cfh-btn--${variant}`;
    if (cta.onClick) {
      return (
        <button type="button" className={className} onClick={cta.onClick}>
          {cta.label}
        </button>
      );
    }
    return (
      <a className={className} href={cta.href || '#'} onClick={cta.onClick}>
        {cta.label}
      </a>
    );
  };

  return (
    <section className="cfh-hero" aria-labelledby="cfh-hero-title">
      <div className="cfh-hero__container">
        <div className="cfh-hero__content">
          <h1 id="cfh-hero-title" className="cfh-hero__title">
            {title}
          </h1>
          <p className="cfh-hero__subtitle">{subtitle}</p>
          <div className="cfh-hero__actions">
            {renderCta(primaryCta, 'primary')}
            {secondaryCta ? renderCta(secondaryCta, 'secondary') : null}
          </div>
        </div>
        <figure className="cfh-hero__media">
          <img
            className="cfh-hero__image"
            src="/assets/character-king.jpg"
            alt="Cartoon king character with blue cloak and gold crown"
            width="560"
            height="560"
            loading="eager"
            fetchpriority="high"
          />
        </figure>
      </div>
    </section>
  );
}

export default CharacterFeatureHero;
