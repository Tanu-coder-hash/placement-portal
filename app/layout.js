import './globals.css';

export const metadata = {
  title: 'PlacementPortal — AI-matched campus placements',
  description:
    'University placement portal combining PostgreSQL transactional tracking with pgvector semantic resume-to-job matching.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
