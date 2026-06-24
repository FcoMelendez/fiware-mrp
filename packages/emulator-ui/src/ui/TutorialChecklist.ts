import { bus, BUS } from '../services/EventBus.ts';
import type { NgsiLdEntity } from '../domain/ngsi-ld.ts';

export type StepStatus = 'pending' | 'active' | 'running' | 'completed' | 'failed';

interface GuidedStep {
  id: string;
  title: string;
  shortDesc: string;
  desc: string;
  hood: { method: string; url: string; body?: string; expectedStatus: number };
  workflow?: string[];
  actionLabel?: string;
  promptLabel?: string;
}

interface StepState {
  def: GuidedStep;
  status: StepStatus;
  result?: string;
  apiTrace?: ApiTrace[];
  entities?: NgsiLdEntity[];
}

interface ApiTrace {
  method: string;
  url: string;
  requestSummary?: string;
  responseStatus: number;
  responseSummary: string;
  durationMs: number;
}

const METHOD_COLOR: Record<string, string> = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PATCH: '#f59e0b',
  DELETE: '#ef4444',
};

const TUTORIAL_SUBTITLES: Record<string, string> = {
  'tutorial-01': 'Tutorial 01 – Getting started with the FIWARE MRP context',
  'tutorial-02': 'Tutorial 02 – Inventory balances and material receipts',
};

const TUTORIAL_WELCOME: Record<string, { title: string; body: string }> = {
  'tutorial-01': {
    title: 'Welcome to Tutorial 01',
    body: 'Start with <em>Verify the stack</em> to check all services are up, then load the seed data to populate the factory canvas with real NGSI-LD entities. Each step shows you the exact API call made under the hood.',
  },
  'tutorial-02': {
    title: 'Welcome to Tutorial 02',
    body: 'This tutorial adds the <em>inventory-service</em> to the stack. You will receive raw materials into WH-STOCK and build up InventoryBalance entities via the <em>receive-material</em> command.',
  },
};

export class TutorialChecklist {
  private el: HTMLElement;
  private steps: StepState[] = [];
  private expandedIds = new Set<string>();
  private tutorialId = 'tutorial-01';

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`TutorialChecklist: #${containerId} not found`);
    this.el = el;

    this.loadSteps().then(() => this.render());

    bus.on<string>(BUS.ENTITY_SELECTED, () => {
      this.maybeCompletePromptStep('explore-plant');
    });

    document.getElementById('restart-scenario-btn')?.addEventListener('click', () => {
      fetch(`/api/scenarios/${this.tutorialId}/reset`, { method: 'POST' })
        .catch(() => {/* non-fatal: UI resets regardless */})
        .finally(() => this.reset());
    });

    // Tutorial selector in top bar
    const selector = document.getElementById('tutorial-selector') as HTMLSelectElement | null;
    selector?.addEventListener('change', () => {
      this.switchTutorial(selector.value);
    });
  }

  switchTutorial(tutorialId: string): void {
    if (this.tutorialId === tutorialId) return;
    this.tutorialId = tutorialId;
    this.updateTopBar(tutorialId);
    this.expandedIds.clear();

    // Reset canvas overlay, welcome banner, and console
    document.getElementById('canvas-overlay')?.classList.remove('hidden');
    document.getElementById('welcome-banner')?.classList.remove('hidden');
    this.clearConsolePanels();
    bus.emit(BUS.SCENARIO_RESET, undefined);

    // Reload steps for the new tutorial, then render
    this.loadSteps().then(() => this.render());
  }

  private updateTopBar(tutorialId: string): void {
    const subtitle = document.getElementById('top-subtitle');
    if (subtitle) subtitle.textContent = TUTORIAL_SUBTITLES[tutorialId] ?? tutorialId;

    const welcomeTitle = document.getElementById('welcome-title');
    const welcomeBody  = document.getElementById('welcome-body');
    const info = TUTORIAL_WELCOME[tutorialId];
    if (info) {
      if (welcomeTitle) welcomeTitle.textContent = info.title;
      if (welcomeBody)  welcomeBody.innerHTML = info.body;
    }

    const panelTitle = document.querySelector<HTMLElement>('#left-panel-header-text h2');
    if (panelTitle) panelTitle.textContent = `Guided Tour — ${tutorialId === 'tutorial-01' ? 'T01' : 'T02'}`;
  }

  private async loadSteps(): Promise<void> {
    try {
      const res = await fetch(`/api/scenarios/${this.tutorialId}/steps`);
      if (res.ok) {
        const defs = (await res.json()) as GuidedStep[];
        this.steps = defs.map((def, i) => ({
          def,
          status: i === 0 ? 'active' : 'pending',
        }));
        return;
      }
    } catch { /* fall through */ }

    this.steps = BUILT_IN_STEPS.map((def, i) => ({
      def,
      status: i === 0 ? 'active' : 'pending',
    }));
  }

  private render(): void {
    this.el.innerHTML = '';

    for (let i = 0; i < this.steps.length; i++) {
      const s = this.steps[i];
      const isExpanded = this.expandedIds.has(s.def.id) || s.status === 'active' || s.status === 'running';
      const card = document.createElement('div');
      card.className = `step-card step-${s.status}`;
      card.dataset['stepId'] = s.def.id;

      card.innerHTML = `
        <div class="step-header" data-step="${s.def.id}">
          <div class="step-indicator">${this.icon(s.status, i + 1)}</div>
          <div class="step-info">
            <div class="step-title">${s.def.title}</div>
            <div class="step-short">${s.def.shortDesc}</div>
          </div>
          <div class="step-chevron">${isExpanded ? '▲' : '▼'}</div>
        </div>
        <div class="step-body ${isExpanded ? '' : 'hidden'}">
          <p class="step-desc">${s.def.desc}</p>
          ${this.renderHood(s)}
          ${this.renderAction(s)}
        </div>
      `;

      // Step header → expand/collapse
      card.querySelector<HTMLElement>('.step-header')!.addEventListener('click', () => {
        this.toggleExpand(s.def.id);
      });

      // Execute button
      card.querySelector<HTMLElement>('.btn-execute')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.executeStep(s.def.id).catch(console.error);
      });

      // Retry button
      card.querySelector<HTMLElement>('.btn-retry')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const stepId = (e.currentTarget as HTMLElement).dataset['retry']!;
        this.retryStep(stepId);
      });


      this.el.appendChild(card);
    }
  }

  private icon(status: StepStatus, num: number): string {
    if (status === 'completed') return '✓';
    if (status === 'failed') return '✗';
    if (status === 'running') return '⟳';
    if (status === 'active') return '▶';
    return String(num);
  }

  private renderAction(s: StepState): string {
    if (s.status === 'running') return '<div class="step-running-label">Running…</div>';

    const retryBtn = (s.status === 'completed' || s.status === 'failed')
      ? `<button class="btn-retry" data-retry="${s.def.id}">↺ Retry</button>`
      : '';

    if (s.status === 'completed') return retryBtn;
    if (s.status !== 'active') return '';

    if (s.def.promptLabel) {
      return `<div class="step-prompt">${s.def.promptLabel}</div>${retryBtn}`;
    }
    if (s.def.actionLabel) {
      return `<button class="btn-execute">${s.def.actionLabel}</button>`;
    }
    return '';
  }

  private renderHood(s: StepState): string {
    if (s.status === 'pending' || s.status === 'active' || s.status === 'running') return '';

    const workflow = s.def.workflow ?? [];
    const trace    = s.apiTrace?.[0];

    const wfLines = workflow.map((line, idx) => `
      <div class="wf-step">
        <span class="wf-num">${idx + 1}.</span>
        <span class="wf-text">${line}</span>
      </div>`).join('');

    const traceRow = trace ? `
      <div style="border-top:1px solid #1e293b;margin:7px 0 5px"></div>
      <div class="api-row">
        <span class="api-method" style="background:${METHOD_COLOR[trace.method] ?? '#64748b'}">${trace.method}</span>
        <span class="api-url" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${trace.url}</span>
        <span class="trace-status ${trace.responseStatus < 300 ? 'ok' : 'err'}">← ${trace.responseStatus}</span>
        <span class="trace-ms">${trace.durationMs}ms</span>
      </div>
      ${s.result ? `<div style="color:#6ee7b7;font-size:10px;font-family:monospace;margin-top:4px;line-height:1.4">${s.result}</div>` : ''}
    ` : '';

    return `
      <div class="hood-content">
        <div style="color:#475569;font-size:9px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px">⚙ Under the hood</div>
        ${wfLines || '<span style="color:#475569;font-size:10px">No workflow defined.</span>'}
        ${traceRow}
      </div>
    `;
  }

  private toggleExpand(stepId: string): void {
    if (this.expandedIds.has(stepId)) {
      this.expandedIds.delete(stepId);
    } else {
      this.expandedIds.add(stepId);
    }
    this.render();
  }

  private async executeStep(stepId: string): Promise<void> {
    const idx = this.steps.findIndex((s) => s.def.id === stepId);
    if (idx < 0) return;

    this.steps[idx].status = 'running';
    this.render();

    try {
      const res = await fetch(`/api/scenarios/${this.tutorialId}/steps/${stepId}/execute`, {
        method: 'POST',
      });
      const data = (await res.json()) as {
        status: string;
        result: string;
        apiTrace?: ApiTrace[];
        entities?: NgsiLdEntity[];
      };

      this.steps[idx].status = data.status === 'completed' ? 'completed' : 'failed';
      this.steps[idx].result = data.result;
      this.steps[idx].apiTrace = data.apiTrace;
      this.steps[idx].entities = data.entities;

      // Auto-expand result
      this.expandedIds.add(stepId);

      // Advance to next step
      if (data.status === 'completed' && idx + 1 < this.steps.length) {
        const next = this.steps[idx + 1];
        if (next.status === 'pending') {
          next.status = 'active';
          this.expandedIds.add(next.def.id);
        }
      }

      // Highlight matching canvas zones for returned entities
      if (data.entities?.length) {
        bus.emit(BUS.ZONES_HIGHLIGHTED, data.entities.map((e: NgsiLdEntity) => e.id));
      }
      // Show entities in inspector: list for multiple, single select for one
      if (data.entities?.length === 1) {
        bus.emit(BUS.ENTITY_SELECTED, data.entities[0].id);
      } else if ((data.entities?.length ?? 0) > 1) {
        bus.emit(BUS.ENTITIES_LISTED, data.entities);
      }

      // Update request + response consoles
      this.updateConsole(data.result, data, this.steps[idx].def);

    } catch (err) {
      this.steps[idx].status = 'failed';
      this.steps[idx].result = err instanceof Error ? err.message : String(err);
    }

    this.render();
  }

  private updateConsole(result: string, data: { apiTrace?: ApiTrace[]; [key: string]: unknown }, def: GuidedStep): void {
    // ── REQUEST console ────────────────────────────────────────────────────
    const reqEl = document.getElementById('request-console');
    if (reqEl && def) {
      const t = data.apiTrace?.[0];
      const method = t?.method ?? def.hood.method;
      const url    = t?.url    ?? def.hood.url;
      const body   = t?.requestSummary ?? def.hood.body ?? '';

      const reqPre  = reqEl.querySelector<HTMLElement>('.console-pre');
      const copyBtn = reqEl.querySelector<HTMLButtonElement>('.btn-copy-curl-req');

      if (reqPre) reqPre.textContent = `${method}  ${url}${body ? '\n' + body : ''}`;

      if (copyBtn) {
        const curl = this.buildCurl(method, url, def.hood.body ?? '');
        copyBtn.disabled = false;
        copyBtn.textContent = 'Copy curl';
        copyBtn.classList.remove('copied');
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(curl).then(() => {
            copyBtn.textContent = '✓ Copied';
            copyBtn.classList.add('copied');
            setTimeout(() => {
              copyBtn.textContent = 'Copy curl';
              copyBtn.classList.remove('copied');
            }, 2000);
          }).catch(() => {/* clipboard unavailable */});
        };
      }
    }

    // ── RESPONSE console ───────────────────────────────────────────────────
    const resEl = document.getElementById('response-console');
    if (!resEl) return;

    const resultEl = resEl.querySelector<HTMLElement>('.console-result');
    const preEl    = resEl.querySelector<HTMLElement>('.console-pre');
    const copyBtn  = resEl.querySelector<HTMLButtonElement>('.btn-copy-answer');

    const raw = JSON.stringify(data, null, 2);
    if (resultEl) resultEl.textContent = result;
    if (preEl)    preEl.textContent = raw;

    bus.emit(BUS.STEP_COMPLETED, undefined);

    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(raw).then(() => {
          copyBtn.textContent = '✓ Copied';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy answer';
            copyBtn.classList.remove('copied');
          }, 2000);
        }).catch(() => {/* clipboard unavailable */});
      };
    }
  }

  private clearConsolePanels(): void {
    const reqEl = document.getElementById('request-console');
    if (reqEl) {
      const pre = reqEl.querySelector<HTMLElement>('.console-pre');
      const btn = reqEl.querySelector<HTMLButtonElement>('.btn-copy-curl-req');
      if (pre) pre.innerHTML = '<span class="console-empty">Execute a step to see the outgoing request…</span>';
      if (btn) { btn.disabled = true; btn.textContent = 'Copy curl'; btn.classList.remove('copied'); }
    }
    const resEl = document.getElementById('response-console');
    if (resEl) {
      const pre = resEl.querySelector<HTMLElement>('.console-pre');
      const resultEl = resEl.querySelector<HTMLElement>('.console-result');
      if (pre) pre.innerHTML = '<span class="console-empty">Run a step to see the response here…</span>';
      if (resultEl) resultEl.textContent = '';
    }
  }

  private buildCurl(method: string, url: string, body: string): string {
    const h1 = '-H "Accept: application/ld+json"';
    const h2 = '-H "Content-Type: application/ld+json"';
    if (method === 'GET') return `curl -X GET "${url}" \\\n  ${h1}`;
    const bodyPart = body ? ` \\\n  -d '${body}'` : '';
    return `curl -X ${method} "${url}" \\\n  ${h1} \\\n  ${h2}${bodyPart}`;
  }

  private retryStep(stepId: string): void {
    const idx = this.steps.findIndex((s) => s.def.id === stepId);
    if (idx < 0) return;
    this.steps[idx].status = 'active';
    this.steps[idx].result = undefined;
    this.steps[idx].apiTrace = undefined;
    this.steps[idx].entities = undefined;
    this.expandedIds.add(stepId);
    this.render();
    this.executeStep(stepId).catch(console.error);
  }

  private reset(): void {
    // Reset all step states
    this.steps.forEach((s, i) => {
      s.status = i === 0 ? 'active' : 'pending';
      s.result = undefined;
      s.apiTrace = undefined;
      s.entities = undefined;
    });
    this.expandedIds.clear();
    if (this.steps[0]) this.expandedIds.add(this.steps[0].def.id);
    this.render();

    // Re-show canvas overlay and welcome banner; reset console panels
    document.getElementById('canvas-overlay')?.classList.remove('hidden');
    document.getElementById('welcome-banner')?.classList.remove('hidden');
    this.clearConsolePanels();

    // Broadcast reset so inspector and canvas clear
    bus.emit(BUS.SCENARIO_RESET, undefined);
  }

  private maybeCompletePromptStep(stepId: string): void {
    const step = this.steps.find((s) => s.def.id === stepId);
    if (step && step.status === 'active' && step.def.promptLabel) {
      step.status = 'completed';
      const idx = this.steps.indexOf(step);
      if (idx + 1 < this.steps.length && this.steps[idx + 1].status === 'pending') {
        this.steps[idx + 1].status = 'active';
        this.expandedIds.add(this.steps[idx + 1].def.id);
      }
      this.render();
    }
  }
}

// ── Built-in step fallback (mirrors gateway fixtures) ─────────────────────────

const BUILT_IN_STEPS: GuidedStep[] = [
  {
    id: 'stack-health',
    title: 'Verify the stack',
    shortDesc: 'Check that all services are healthy',
    desc: 'Before loading data the emulator verifies that Orion-LD, the context server and the MRP API are all responding.',
    hood: { method: 'GET', url: '/api/ready', expectedStatus: 200 },
    workflow: [
      'Emulator → GET /api/ready → Gateway (health aggregator)',
      'Gateway → GET /ngsi-ld/v1/version → Orion-LD',
      'All services healthy → { status: ok }',
    ],
    actionLabel: 'Check health',
  },
  {
    id: 'seed-entities',
    title: 'Load seed data',
    shortDesc: 'Create 12 NGSI-LD entities in Orion-LD',
    desc: 'Seeds the FIWARE Context Broker with 1 Company, 1 Plant, 3 WorkCenters, 5 Products and 2 StockLocations.',
    hood: {
      method: 'POST',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entityOperations/upsert',
      body: '12 entities  •  application/ld+json',
      expectedStatus: 201,
    },
    workflow: [
      'Gateway attaches @context URL to each of the 12 entity payloads',
      'POST /ngsi-ld/v1/entityOperations/upsert (application/ld+json) → Orion-LD',
      'Orion-LD stores: 1 Company · 1 Plant · 3 WorkCenter · 5 Product · 2 StockLocation',
    ],
    actionLabel: 'Seed entities',
  },
  {
    id: 'explore-plant',
    title: 'Inspect the Plant',
    shortDesc: 'Click a zone to see its NGSI-LD entity',
    desc: 'Every coloured zone is bound to an NGSI-LD entity. Click one to fetch it and view the normalised JSON-LD.',
    hood: { method: 'GET', url: '/ngsi-ld/v1/entities/urn:ngsi-ld:Plant:Plant-BCN', expectedStatus: 200 },
    workflow: [
      'User clicks a factory zone → zone entityId resolved',
      'GET /ngsi-ld/v1/entities/:id + Link: <context>; rel=context → Orion-LD',
      'Entity Inspector renders Properties and Relationships',
    ],
    promptLabel: 'Click any zone on the canvas →',
  },
  {
    id: 'query-workcenters',
    title: 'Query WorkCenters',
    shortDesc: 'Fetch all 3 WorkCenters from the broker',
    desc: 'The NGSI-LD query API lets you retrieve all entities of a type in one request.',
    hood: { method: 'GET', url: '/ngsi-ld/v1/entities?type=WorkCenter', expectedStatus: 200 },
    workflow: [
      'GET /ngsi-ld/v1/entities?type=WorkCenter + Link: <context>; rel=context → Orion-LD',
      'Orion-LD returns 3 WorkCenter entities (WC-ASM, WC-LTB, WC-PKG)',
    ],
    actionLabel: 'Query WorkCenters',
  },
  {
    id: 'query-products',
    title: 'Browse Products',
    shortDesc: 'Fetch the 5-item product catalogue',
    desc: 'Products are the items the factory makes or buys. HydraulicPump-P100 is the manufactured finished good.',
    hood: { method: 'GET', url: '/ngsi-ld/v1/entities?type=Product', expectedStatus: 200 },
    workflow: [
      'GET /ngsi-ld/v1/entities?type=Product + Link: <context>; rel=context → Orion-LD',
      'Orion-LD returns 5 Product entities (1 manufactured, 4 purchased)',
    ],
    actionLabel: 'Browse Products',
  },
  {
    id: 'query-stocklocations',
    title: 'Inspect StockLocations',
    shortDesc: 'See the 2 warehouse zones',
    desc: 'StockLocations represent physical inventory zones linked to the Plant via an NGSI-LD Relationship.',
    hood: { method: 'GET', url: '/ngsi-ld/v1/entities?type=StockLocation', expectedStatus: 200 },
    workflow: [
      'GET /ngsi-ld/v1/entities?type=StockLocation + Link: <context>; rel=context → Orion-LD',
      'Orion-LD returns 2 StockLocations: WH-STOCK · WH-FINISHED',
    ],
    actionLabel: 'Query StockLocations',
  },
];
