export default function QrNotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">Codigo no valido</h1>
      <p className="text-sm text-neutral-500">
        Este codigo QR no esta activo o el establecimiento no esta disponible ahora mismo.
      </p>
    </main>
  );
}
