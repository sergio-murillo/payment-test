'use client';

import { ConfigProvider } from 'antd';
import { ReduxProvider } from '@/store/provider';
import './globals.css';

// Metadata moved to page.tsx or handled via Head component

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#722ed1',
              },
            }}
          >
            {children}
          </ConfigProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
