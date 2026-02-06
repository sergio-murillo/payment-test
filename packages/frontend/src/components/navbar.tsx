'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Badge, Tooltip } from 'antd';
import { ShoppingCartOutlined, ShopOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentTransaction } = useAppSelector((state) => state.transaction);

  const isHome = pathname === '/';

  const hasPendingTransaction =
    currentTransaction && ['PENDING'].includes(currentTransaction.status);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo / Brand */}
        <div
          className="navbar-brand"
          onClick={() => router.push('/')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/')}
        >
          <ShopOutlined className="navbar-brand-icon" />
          <span className="navbar-brand-text">Payment Store</span>
        </div>

        {/* Nav Actions */}
        <div className="navbar-actions">
          <Tooltip title="Catálogo de productos">
            <button
              className={`navbar-btn ${isHome ? 'navbar-btn-active' : ''}`}
              onClick={() => router.push('/')}
              aria-label="Ir al catálogo"
            >
              <ShopOutlined />
              <span className="navbar-btn-label">Catálogo</span>
            </button>
          </Tooltip>

          {hasPendingTransaction && (
            <Tooltip title="Tienes una transacción en curso">
              <div className="navbar-btn" style={{ opacity: 0.6, cursor: 'default' }}>
              <Badge
                dot={!!hasPendingTransaction}
                offset={[-2, 2]}
                color="#f59e0b"
              >
                <ShoppingCartOutlined
                  style={{
                    fontSize: 'inherit',
                    color: 'inherit',
                  }}
                />
              </Badge>
                <span className="navbar-btn-label">Pago en curso</span>
              </div>
          </Tooltip>
          )}
        </div>
      </div>
    </nav>
  );
}
