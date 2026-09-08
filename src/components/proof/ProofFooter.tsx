export function ProofFooter({ note }: { note: string }) {
  return (
    <footer className="mt-12 border-t border-border/40 pt-6">
      <p className="text-center text-[11px] text-muted-foreground">{note}</p>
    </footer>
  );
}
