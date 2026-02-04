'use client';

import { useState, useEffect } from 'react';
import { DeviceType, getDeviceType } from '@/utils/image-optimizer';

/**
 * Hook para detectar el tipo de dispositivo
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const updateDeviceType = () => {
      setDeviceType(getDeviceType());
    };

    // Establecer el tipo inicial
    updateDeviceType();

    // Escuchar cambios en el tamaño de la ventana
    window.addEventListener('resize', updateDeviceType);

    return () => {
      window.removeEventListener('resize', updateDeviceType);
    };
  }, []);

  return deviceType;
}
