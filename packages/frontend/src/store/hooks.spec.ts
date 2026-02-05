import { useAppDispatch, useAppSelector } from './hooks';
import { useDispatch, useSelector } from 'react-redux';

jest.mock('react-redux');

describe('store hooks', () => {
  it('useAppDispatch should return typed dispatch', () => {
    const mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    const dispatch = useAppDispatch();
    expect(dispatch).toBe(mockDispatch);
  });

  it('useAppSelector should be a typed selector', () => {
    expect(useAppSelector).toBe(useSelector);
  });
});
