import { motion } from "framer-motion";
import { Palette, Zap, Package, Truck } from "lucide-react";

const features = [
  {
    icon: Palette,
    title: "Premium DTF Print Quality",
    desc: "Vibrant, durable, and high-quality prints using Direct-to-Film (DTF) technology.",
  },
  {
    icon: Zap,
    title: "Easy-to-Use Design Tool",
    desc: "Effortlessly create your own custom designs with our intuitive built-in builder.",
  },
  {
    icon: Package,
    title: "Fast Production",
    desc: "With a large on-site warehouse, we guarantee quick manufacturing and order processing.",
  },
  {
    icon: Truck,
    title: "Convenient Delivery",
    desc: "Get your order delivered smoothly to any Omniva parcel machine.",
  },
];

const steps = [
  { num: "1", title: "Choose a Product", desc: "Select from our catalog of t-shirts, hoodies, and mugs." },
  { num: "2", title: "Personalize It", desc: "Customize your item using our built-in design tool." },
  { num: "3", title: "Place Your Order", desc: "Complete your checkout and pay securely online." },
  { num: "4", title: "Receive Your Order", desc: "Collect your item from any Omniva parcel machine within 1-2 business days." },
];

export const AboutSection = () => {
  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl mb-6">
            T-Bode is a place where a T-shirt becomes a story.
          </h2>
          <p className="text-muted-foreground leading-relaxed font-body">
            In our stores in <strong className="text-foreground">Riga, Latvia</strong>, you can visit us in person,
            try on a T-shirt, choose the color and size, and submit your design or idea – we'll take care of the rest.
            We use modern <strong className="text-foreground">DTF (Direct to Film) technology</strong> for vibrant
            colors on both light and dark fabrics.
          </p>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-lg p-6 border border-border hover:border-primary/40 transition-colors"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <f.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-body font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground font-body">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
                {step.num}
              </div>
              <h4 className="font-body font-semibold mb-2">{step.title}</h4>
              <p className="text-sm text-muted-foreground font-body">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
