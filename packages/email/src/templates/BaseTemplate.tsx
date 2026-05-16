import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BaseTemplateProps {
  previewText?: string;
  heading?: string;
  content: string;
}

export const BaseTemplate = ({
  previewText = "Welcome to FlowMail",
  heading,
  content,
}: BaseTemplateProps) => (
  <Html>
    <Head />
    <Preview>{previewText}</Preview>
    <Body style={main}>
      <Container style={container}>
        {heading && <Heading style={h1}>{heading}</Heading>}
        <Section>
          <Text style={text}>{content}</Text>
        </Section>
        <Section>
          <Text style={footer}>
            Sent via FlowMail - The Ultimate AI Email Layer
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "580px",
};

const h1 = {
  color: "#1d1c1d",
  fontSize: "24px",
  fontWeight: "700",
  margin: "30px 0",
  padding: "0",
  lineHeight: "42px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
};

const footer = {
  color: "#898989",
  fontSize: "12px",
  lineHeight: "22px",
  marginTop: "12px",
};
