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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="lv" dir="ltr">
    <Head />
    <Preview>Apstiprini savu e-pastu — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={logo} alt={siteName} width="120" style={logoStyle} />
        <Heading style={h1}>Apstiprini savu e-pastu</Heading>
        <Text style={text}>
          Paldies, ka pievienojies{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>!
        </Text>
        <Text style={text}>
          Lūdzu apstiprini savu e-pasta adresi (
          <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
          ), noklikšķinot uz pogas zemāk:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Apstiprināt e-pastu
        </Button>
        <Text style={footer}>
          Ja Tu neveidoji kontu, vari droši ignorēt šo e-pastu.
        </Text>
        <Text style={signature}>— {siteName} komanda</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
