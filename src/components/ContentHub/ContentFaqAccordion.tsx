import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { ContentHubRow } from '@/types/contentHub';

type ContentFaqAccordionProps = {
  items: ContentHubRow[];
};

export const ContentFaqAccordion = ({ items }: ContentFaqAccordionProps) => (
  <Accordion type="single" collapsible className="w-full">
    {items.map((item) => (
      <AccordionItem key={item.id} value={item.id}>
        <AccordionTrigger className="text-left text-base font-semibold">
          {item.title}
        </AccordionTrigger>
        <AccordionContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {item.content}
          </div>
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);
