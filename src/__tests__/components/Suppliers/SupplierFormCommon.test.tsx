import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';

vi.mock('@/contexts/LocalizationContext', () => {
  return {
    useLocalization: () => ({
      t: (k: string) => k,
    }),
  };
});

import SupplierFormCommon from '@/components/Suppliers/SupplierFormCommon';

const SupplierFormCommonHarness = () => {
  const form = useForm({
    defaultValues: {
      name: '',
      category: '',
      contact_email: '',
      contact_phone: '',
    },
  });

  return (
    <SupplierFormCommon form={form} onCancel={() => {}} />
  );
};

describe('SupplierFormCommon', () => {
  it('renders without throwing and uses translated placeholder', () => {
    render(<SupplierFormCommonHarness />);
    expect(screen.getByPlaceholderText('additionalPlaceholders.materialCategory')).toBeInTheDocument();
  });
});
