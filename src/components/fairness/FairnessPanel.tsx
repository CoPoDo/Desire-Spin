import { useEffect, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { useGame } from '../../game-context';
import { shortHash } from '../../lib/format';

export function FairnessPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { fairness } = useGame();
  const [clientDraft, setClientDraft] = useState(fairness.seeds.clientSeed);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => { if (open) { setClientDraft(fairness.seeds.clientSeed); setCopyError(false); } }, [open, fairness.seeds.clientSeed]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setCopyError(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Local fairness replay" width="lg">
      <div className="space-y-5">
        {copyError && <p role="status" className="text-sm text-ink-dim">Clipboard unavailable. Select and copy the seed text manually.</p>}
        <p className="text-sm text-ink-dim">
          Every result is deterministic from a local secret seed, your client seed, and a
          per-bet nonce. All values are created and stored in this browser. The hash supports
          replay and tamper checks, but it is not an independent server commitment.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Local secret seed hash">
            <code className="font-mono text-xs break-all">{fairness.hash}</code>
            <button
              className="mt-2 btn-ghost py-1 px-2 text-xs"
              onClick={() => copy('hash', fairness.hash)}
            >
              {copied === 'hash' ? 'Copied!' : 'Copy'}
            </button>
          </Field>
          <Field label="Nonce (bet counter)">
            <code className="font-mono text-2xl font-semibold">{fairness.seeds.nonce}</code>
          </Field>
        </div>

        <Field label="Client seed (you control)">
          <div className="flex gap-2">
            <input
              aria-label="Client seed"
              className="input font-mono text-sm flex-1 min-w-0"
              value={clientDraft}
              onChange={(e) => setClientDraft(e.target.value)}
              spellCheck={false}
              maxLength={64}
            />
            <button
              className="btn-primary"
              onClick={() => fairness.setClientSeed(clientDraft)}
              disabled={clientDraft.trim() === fairness.seeds.clientSeed}
            >
              Save
            </button>
          </div>
          <p className="text-xs text-ink-mute mt-2">
            Changing your client seed alters every future spin's outcome.
          </p>
        </Field>

        <div className="card p-4 space-y-3 bg-bg-elev/60">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h3 className="font-semibold">Rotate local secret seed</h3>
              <p className="text-xs text-ink-dim">
                Reveal the current local seed and start a fresh one. Only the most recent
                revealed seed is kept; copy it before rotating again.
              </p>
            </div>
            <button className="btn-primary" onClick={fairness.rotate}>
              Rotate
            </button>
          </div>
          {fairness.previous && (
            <div className="border-t border-edge pt-3 space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="label">Revealed local secret seed</span>
                <code className="font-mono break-all">{fairness.previous.serverSeed}</code>
                <button
                  className="btn-ghost py-0.5 px-2 text-[11px]"
                  onClick={() => copy('rev', fairness.previous!.serverSeed)}
                >
                  {copied === 'rev' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="label">Client seed used</span>
                <code className="font-mono">{fairness.previous.clientSeed}</code>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="label">Last nonce reached</span>
                <code className="font-mono">{fairness.previous.nonce}</code>
              </div>
            </div>
          )}
        </div>

        <div className="card p-4 bg-bg-elev/60 text-xs space-y-2">
          <h3 className="font-semibold text-ink">How verification works</h3>
          <ol className="list-decimal pl-4 space-y-1 text-ink-dim">
            <li>
              For each bet: <code className="font-mono">bytes = HMAC_SHA256(serverSeed, "{`{clientSeed}:{nonce}:{cursor}`}")</code>
            </li>
            <li>Slice each 4 bytes into a uint32 → divide by 2³² → float in [0,1).</li>
            <li>The matching engine rules revision consumes those floats to produce the result. History preserves earlier results; changed game rules or local weights can produce a different result from the same seeds.</li>
            <li>
              SHA-256 of the revealed local seed must match its earlier displayed hash{' '}
              <code className="font-mono">{shortHash(fairness.hash)}</code>.
            </li>
          </ol>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 bg-bg-elev/40">
      <div className="label mb-1">{label}</div>
      {children}
    </div>
  );
}
