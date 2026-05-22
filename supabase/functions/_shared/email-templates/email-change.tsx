/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="lv" dir="ltr">
    <Head />
    <Preview>Apstiprini e-pasta maiņu — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={logo} alt={siteName} width="120" style={logoStyle} />
        <Heading style={h1}>Apstiprini e-pasta maiņu</Heading>
        <Text style={text}>
          Tu pieprasīji nomainīt savu {siteName} e-pasta adresi no{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>{' '}
          uz{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>
          Noklikšķini uz pogas zemāk, lai apstiprinātu izmaiņas:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Apstiprināt maiņu
        </Button>
        <Text style={footer}>
          Ja Tu nepieprasīji šo maiņu, nekavējoties nodrošini savu kontu.
        </Text>
        <Text style={signature}>— {siteName} komanda</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logo = 'https://nkqwhiqrljwvzrivhqyh.supabase.co/storage/v1/object/public/email-assets/logo.png'
const logoStyle = { margin: '0 0 24px', display: 'block' as const }
const h1 = {
  fontSize: '26px',
  fontWeight: 'bold' as const,
  color: '#111111',
  margin: '0 0 20px',
  letterSpacing: '0.5px',
}
const text = {
  fontSize: '15px',
  color: '#444444',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const link = { color: '#DC2626', textDecoration: 'underline' }
const button = {
  backgroundColor: '#DC2626',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 8px' }
const signature = { fontSize: '13px', color: '#666666', margin: '4px 0 0' }
