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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="lv" dir="ltr">
    <Head />
    <Preview>Atjauno savu paroli — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={logo} alt={siteName} width="120" style={logoStyle} />
        <Heading style={h1}>Atjauno savu paroli</Heading>
        <Text style={text}>
          Saņēmām pieprasījumu atjaunot Tavu {siteName} paroli. Noklikšķini uz
          pogas zemāk, lai izvēlētos jaunu paroli.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Atjaunot paroli
        </Button>
        <Text style={footer}>
          Ja Tu nepieprasīji paroles atjaunošanu, vari droši ignorēt šo e-pastu.
          Tava parole netiks mainīta.
        </Text>
        <Text style={signature}>— {siteName} komanda</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
