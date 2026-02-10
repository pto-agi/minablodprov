import { BloodMarker, Measurement } from './types';

export const MARKERS: BloodMarker[] = [
  {
    id: 'hb',
    name: 'Hemoglobin',
    shortName: 'Hb',
    unit: 'g/L',
    minRef: 134,
    maxRef: 170,
    category: 'Blod & Järn',
    description: 'Hemoglobin är ett protein som finns i röda blodkroppar och transporterar syre från lungorna till kroppens vävnader. Låga värden kan tyda på anemi.',
    displayMin: 110,
    displayMax: 195
  },
  {
    id: 'ferritin',
    name: 'Ferritin',
    shortName: 'Ferritin',
    unit: 'µg/L',
    minRef: 30,
    maxRef: 400,
    category: 'Blod & Järn',
    description: 'Ferritin speglar kroppens järndepåer. Låga nivåer är det tidigaste tecknet på järnbrist.',
    displayMin: 0,
    displayMax: 500
  },
  {
    id: 'ts',
    name: 'Testosteron',
    shortName: 'T',
    unit: 'nmol/L',
    minRef: 8.6,
    maxRef: 29,
    category: 'Hormoner',
    description: 'Testosteron är det primära manliga könshormonet. Det påverkar muskelmassa, energinivåer och humör.',
    displayMin: 0,
    displayMax: 40
  },
  {
    id: 'evf',
    name: 'Hematokrit',
    shortName: 'EVF',
    unit: '%', // Often represented as ratio 0.39-0.50 but visuals usually easier in decimals or whole %
    minRef: 0.39,
    maxRef: 0.50,
    category: 'Blod & Järn',
    description: 'Andelen röda blodkroppar i blodet. Höga värden kan indikera uttorkning eller överproduktion av röda blodkroppar.',
    displayMin: 0.30,
    displayMax: 0.60
  }
];

export const MOCK_MEASUREMENTS: Measurement[] = [
  // Hemoglobin History (Trending up towards high)
  { id: '1', markerId: 'hb', value: 145, date: '2023-01-15' },
  { id: '2', markerId: 'hb', value: 152, date: '2023-06-20' },
  { id: '3', markerId: 'hb', value: 168, date: '2023-12-05' },
  { id: '4', markerId: 'hb', value: 184, date: '2024-02-14' }, // Current High

  // Ferritin History (Normal)
  { id: '5', markerId: 'ferritin', value: 120, date: '2023-06-20' },
  { id: '6', markerId: 'ferritin', value: 115, date: '2024-02-14' },

  // Testosterone (Low)
  { id: '7', markerId: 'ts', value: 12, date: '2023-01-15' },
  { id: '8', markerId: 'ts', value: 8.4, date: '2024-02-14' },

  // EVF
  { id: '9', markerId: 'evf', value: 0.45, date: '2024-02-14' },
];