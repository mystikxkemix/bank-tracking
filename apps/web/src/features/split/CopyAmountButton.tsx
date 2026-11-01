import { CheckIcon, CopyIcon } from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';
import { useRef, useState } from 'react';
import { centsToInput, formatCents } from '../../lib/format';

/**
 * Copies "1953,33" (no thousands separator, no currency) so it pastes as-is in a banking app transfer form.
 * navigator.clipboard is missing on plain HTTP installs: fall back to a hidden textarea + execCommand.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission refused: try the fallback below.
  }
  const area: HTMLTextAreaElement = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok: boolean = document.execCommand('copy');
  document.body.removeChild(area);
  return ok;
}

export function CopyAmountButton({ cents, label }: { cents: number; label: string }) {
  const [copied, setCopied] = useState<boolean>(false);
  const timer = useRef<number | undefined>(undefined);
  const absolute: number = Math.abs(cents);

  const copy = async (): Promise<void> => {
    const ok: boolean = await copyText(centsToInput(absolute));
    if (ok) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <Button size="1" variant="soft" color={copied ? 'green' : 'gray'} onClick={() => void copy()} aria-label={`Copier le montant ${formatCents(absolute)} ${label}`}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? 'Copié' : 'Copier'}
    </Button>
  );
}
