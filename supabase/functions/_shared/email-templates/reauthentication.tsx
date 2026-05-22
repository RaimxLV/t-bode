/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="lv" dir="ltr">
    <Head />
    <Preview>Tavs apstiprinājuma kods</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={logo} alt="T-Bode" width="120" style={logoStyle} />
        <Heading style={h1}>Apstiprini atkārtotu pieslēgšanos</Heading>
        <Text style={text}>Izmanto kodu zemāk, lai apstiprinātu savu identitāti:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Kods drīz beigsies. Ja Tu nepieprasīji šo, vari droši ignorēt šo e-pastu.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#DC2626',
  margin: '0 0 30px',
  letterSpacing: '4px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
