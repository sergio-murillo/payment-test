import dynamic from 'next/dynamic';

const CheckoutPageClient = dynamic(() => import('./checkout-page-client'), {
  ssr: false,
});

export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
