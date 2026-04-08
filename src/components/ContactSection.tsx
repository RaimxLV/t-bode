import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

export const ContactSection = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Will connect to Brevo later
    console.log("Contact form:", form);
  };

  return (
    <section id="contact" className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-4xl md:text-5xl mb-4">
              Looking to outfit your team or planning an event?
            </h2>
            <p className="text-muted-foreground font-body">
              <strong className="text-foreground">Contact us directly</strong> for competitive pricing on large-scale orders.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="space-y-5 bg-card rounded-lg p-8 border border-border"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div>
              <label className="block text-sm font-medium font-body mb-1.5">First Name *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium font-body mb-1.5">Email Address *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium font-body mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium font-body mb-1.5">
                Message <span className="text-muted-foreground">({form.message.length}/300)</span>
              </label>
              <textarea
                maxLength={300}
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-md font-body font-semibold text-sm text-primary-foreground transition-all hover:scale-[1.02]"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Send className="w-4 h-4" />
              Submit
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};
