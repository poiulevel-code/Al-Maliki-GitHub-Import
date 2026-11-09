export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F5F2]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#1B2A4A] mb-2">404</h1>
        <p className="text-stone-500">Page not found</p>
        <a href="/" className="mt-4 inline-block text-[#C1440E] font-semibold hover:underline">← Go home</a>
      </div>
    </div>
  );
}
