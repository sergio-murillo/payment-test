import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from './navbar';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

jest.mock('next/navigation');
jest.mock('@/store/hooks');

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseAppSelector = useAppSelector as jest.MockedFunction<
  typeof useAppSelector
>;

describe('Navbar', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUsePathname.mockReturnValue('/');
    mockUseAppSelector.mockReturnValue({
      currentTransaction: null,
    } as any);
  });

  it('should render navbar with brand', () => {
    render(<Navbar />);

    expect(screen.getByText('Payment Store')).toBeInTheDocument();
  });

  it('should navigate to home when brand is clicked', () => {
    render(<Navbar />);

    const brand = screen.getByText('Payment Store').closest('div');
    brand?.click();

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should navigate to home when Enter is pressed on brand', () => {
    render(<Navbar />);

    const brand = screen.getByText('Payment Store').closest('[role="button"]')!;
    fireEvent.keyDown(brand, { key: 'Enter' });

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should not navigate when non-Enter key is pressed on brand', () => {
    render(<Navbar />);

    const brand = screen.getByText('Payment Store').closest('[role="button"]')!;
    fireEvent.keyDown(brand, { key: 'Space' });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show catalog button', () => {
    render(<Navbar />);

    expect(screen.getByText('Catálogo')).toBeInTheDocument();
  });

  it('should navigate to home when catalog button is clicked', () => {
    render(<Navbar />);

    const catalogButton = screen.getByText('Catálogo').closest('button');
    catalogButton?.click();

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should show active state when on home page', () => {
    mockUsePathname.mockReturnValue('/');

    render(<Navbar />);

    const catalogButton = screen.getByText('Catálogo').closest('button');
    expect(catalogButton).toHaveClass('navbar-btn-active');
  });

  it('should not show active state when not on home page', () => {
    mockUsePathname.mockReturnValue('/product/prod-001');

    render(<Navbar />);

    const catalogButton = screen.getByText('Catálogo').closest('button');
    expect(catalogButton).not.toHaveClass('navbar-btn-active');
  });

  it('should show pending transaction indicator when transaction is pending', () => {
    mockUseAppSelector.mockReturnValue({
      currentTransaction: {
        id: 'trans-001',
        status: 'PENDING',
      },
    } as any);

    render(<Navbar />);

    expect(screen.getByText('Pago en curso')).toBeInTheDocument();
  });

  it('should not show pending transaction indicator when no transaction', () => {
    mockUseAppSelector.mockReturnValue({
      currentTransaction: null,
    } as any);

    render(<Navbar />);

    expect(screen.queryByText('Pago en curso')).not.toBeInTheDocument();
  });

  it('should not show pending transaction indicator when transaction is not pending', () => {
    mockUseAppSelector.mockReturnValue({
      currentTransaction: {
        id: 'trans-001',
        status: 'APPROVED',
      },
    } as any);

    render(<Navbar />);

    expect(screen.queryByText('Pago en curso')).not.toBeInTheDocument();
  });
});
