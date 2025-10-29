export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-6 pb-6">
      <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm text-muted-foreground shadow">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        AI 正在思考...
      </div>
    </div>
  );
}
