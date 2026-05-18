import React from 'react';
import './DevLabPage.css';

interface DebugToolLink {
  title: string;
  description: string;
  href: string;
  cta: string;
}

const DEBUG_TOOLS: DebugToolLink[] = [
  {
    title: 'Hex Grid Editor',
    description: 'Manual editor for axial patterns and anchor-aware coordinates.',
    href: '../editor/',
    cta: 'Open editor',
  },
  {
    title: 'Field Lab',
    description: 'Noise-only visual sandbox for tuning procedural field parameters.',
    href: '../field-lab/',
    cta: 'Open field lab',
  },
  {
    title: 'Hex Drawer',
    description: 'Canvas hex-object painter with import/export and transform controls.',
    href: '../hex-drawer/',
    cta: 'Open hex drawer',
  },
];

export default function DevLabPage() {
  return (
    <main className="devlab-page">
      <section className="devlab-page__hero">
        <p className="devlab-page__kicker">Developer Entry</p>
        <h1 className="devlab-page__title">DevLab Index</h1>
        <p className="devlab-page__description">
          Unified launchpad for all Hexi debug tools. Use cards below to jump directly into a specific helper page.
        </p>
        <a className="devlab-page__game-link" href="../">Open game</a>
      </section>

      <section className="devlab-page__grid" aria-label="Debug tool links">
        {DEBUG_TOOLS.map((tool) => (
          <article key={tool.href} className="devlab-card">
            <h2 className="devlab-card__title">{tool.title}</h2>
            <p className="devlab-card__description">{tool.description}</p>
            <a className="devlab-card__link" href={tool.href}>{tool.cta}</a>
          </article>
        ))}
      </section>
    </main>
  );
}
