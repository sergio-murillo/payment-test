'use client';

import { ConfigProvider } from 'antd';
import { ReduxProvider } from '@/store/provider';
import { Navbar } from '@/components/navbar';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ReduxProvider>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#722ed1',
                borderRadius: 12,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              },
              components: {
                Button: {
                  borderRadius: 10,
                  controlHeight: 40,
                  fontWeight: 600,
                },
                Card: {
                  borderRadiusLG: 16,
                },
                Modal: {
                  borderRadiusLG: 16,
                },
              },
            }}
          >
            <Navbar />
            {children}
          </ConfigProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
