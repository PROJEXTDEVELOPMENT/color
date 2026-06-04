// app/layout.tsx
import "./globals.css"; // ensure Tailwind is configured
export const metadata = { title: "Data Sell Pro" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#071119] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
