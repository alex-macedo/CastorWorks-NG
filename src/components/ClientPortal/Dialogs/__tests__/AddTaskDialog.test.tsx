import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import { AddTaskDialog } from '../AddTaskDialog';
import TestProviders from '@/test/utils/TestProviders';

// Mock hook
vi.mock('@/hooks/clientPortal/useCreateClientTask', () => ({
  useCreateClientTask: () => ({
    mutateAsync: (payload: any) => Promise.resolve({ id: '1', ...payload }),
  }),
}));

describe('AddTaskDialog', () => {
  it('renders and submits form', async () => {
    const onOpenChange = vi.fn();
    const onTaskCreated = vi.fn();

    render(
      <TestProviders>
        <AddTaskDialog open={true} onOpenChange={onOpenChange} onTaskCreated={onTaskCreated} />
      </TestProviders>
    );

    const input = screen.getByPlaceholderText(
      'clientPortal.tasks.dialog.namePlaceholder'
    );
    fireEvent.change(input, { target: { value: 'New Task' } });

    const submit = screen.getByRole('button', {
      name: 'clientPortal.tasks.dialog.submit',
    });
    fireEvent.click(submit);

    await waitFor(() => expect(onTaskCreated).toHaveBeenCalled());
  });
});
