import dynamic from 'next/dynamic';

const ProductPageClient = dynamic(() => import('./product-page-client'), {
  ssr: false,
});

export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function ProductPage() {
  return <ProductPageClient />;
}
