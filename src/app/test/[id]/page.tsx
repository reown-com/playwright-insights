import TestDetailClient from '@/components/test-detail/test-detail-client';

interface TestDetailPageProps {
  params: {
    id: string; // This will be URL-encoded, e.g. "My%20Test%7CDesktop%20Chrome"
  };
}

export default function TestDetailPage({ params }: TestDetailPageProps) {
  // The ID from the URL might be URL-encoded (e.g., spaces as %20, | as %7C)
  // The `getTestDetails` fetch call inside TestDetailClient uses encodeURIComponent on this ID again,
  // but fetch usually handles URL encoding of path segments automatically if they are not already.
  // However, passing it decoded is generally safer if the client component expects a raw ID.
  // Here, we will pass it as is, and the client component or API route will handle it.
  // Test IDs are like "Test Title|Project Name"
  const decodedId = decodeURIComponent(params.id);

  return <TestDetailClient testId={decodedId} />;
}

// Optional: Add metadata generation if needed
// export async function generateMetadata({ params }: TestDetailPageProps): Promise<Metadata> {
//   const decodedId = decodeURIComponent(params.id);
//   // You might want to fetch basic test info here to set a dynamic title
//   // For simplicity, we'll use a generic title or parts of the ID
//   const [title] = decodedId.split('|');
//   return {
//     title: `Test Details: ${title || 'Unknown Test'}`,
//   };
// } 