export default function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm space-y-1">
      <div className="font-medium text-red-300">Something went wrong</div>
      <div className="text-red-200/80">{message}</div>
      <div className="text-red-200/50 text-xs pt-1">
        If this persists, open <span className="font-mono">/api/health</span> to check the database connection.
      </div>
    </div>
  );
}
