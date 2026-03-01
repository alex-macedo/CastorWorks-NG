import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Hr,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface MaintenanceAlertEmailProps {
  type: 'scheduled' | 'activated';
  title?: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  estimatedTime?: string;
  contactEmail?: string;
}

export const MaintenanceAlertEmail = ({
  type,
  title,
  description,
  scheduledStart,
  scheduledEnd,
  estimatedTime,
  contactEmail,
}: MaintenanceAlertEmailProps) => {
  const isScheduled = type === 'scheduled';
  const previewText = isScheduled 
    ? `Scheduled Maintenance: ${title}` 
    : 'System Maintenance in Progress';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isScheduled ? '🔔 Scheduled Maintenance Notice' : '⚠️ System Maintenance'}
          </Heading>
          
          {isScheduled ? (
            <>
              <Text style={text}>
                We wanted to inform you about upcoming scheduled maintenance:
              </Text>
              <Container style={noticeBox}>
                <Text style={noticeTitle}>{title}</Text>
                {description && (
                  <Text style={noticeDescription}>{description}</Text>
                )}
                {scheduledStart && scheduledEnd && (
                  <>
                    <Text style={noticeDetail}>
                      <strong>Start:</strong> {new Date(scheduledStart).toLocaleString('en-US', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                      })}
                    </Text>
                    <Text style={noticeDetail}>
                      <strong>End:</strong> {new Date(scheduledEnd).toLocaleString('en-US', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                      })}
                    </Text>
                  </>
                )}
              </Container>
              <Text style={text}>
                During this maintenance window, the system may be temporarily unavailable. 
                We apologize for any inconvenience and appreciate your patience.
              </Text>
            </>
          ) : (
            <>
              <Text style={text}>
                Our system is currently undergoing maintenance to improve your experience.
              </Text>
              <Container style={noticeBox}>
                <Text style={noticeDetail}>
                  <strong>Estimated Duration:</strong> {estimatedTime || 'a few hours'}
                </Text>
              </Container>
              <Text style={text}>
                We'll be back online as soon as possible. Thank you for your understanding.
              </Text>
            </>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            If you have any questions or concerns, please contact us at{' '}
            <Link href={`mailto:${contactEmail || 'support@engproapp.com'}`} style={link}>
              {contactEmail || 'support@engproapp.com'}
            </Link>
          </Text>

          <Text style={footerNote}>
            This is an automated notification. Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default MaintenanceAlertEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const noticeBox = {
  backgroundColor: '#f8f9fa',
  borderLeft: '4px solid #007bff',
  margin: '24px 40px',
  padding: '16px 20px',
  borderRadius: '4px',
};

const noticeTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const noticeDescription = {
  color: '#555',
  fontSize: '14px',
  margin: '0 0 12px 0',
  lineHeight: '22px',
};

const noticeDetail = {
  color: '#555',
  fontSize: '14px',
  margin: '8px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 40px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
};

const footerNote = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 40px',
  marginTop: '12px',
};

const link = {
  color: '#007bff',
  textDecoration: 'underline',
};
