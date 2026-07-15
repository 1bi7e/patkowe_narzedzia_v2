export function PlaceholderScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="text-xs font-medium tracking-[0.18em] text-gold-600 uppercase">
        Patkowe Cudeńka
      </p>
      <h1 className="font-serif text-6xl font-medium">
        Salon<span className="italic text-rose-500">.</span>
      </h1>
      <div className="h-px w-24 bg-linear-to-r from-gold-400 to-transparent" />
      <p className="font-light text-brown-600">Rozliczenia salonu — już wkrótce.</p>
    </main>
  )
}
