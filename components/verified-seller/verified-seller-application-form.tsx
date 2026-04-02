"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const defaultForm = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  instagram: "",
  website: "",
  neighborhood: "",
  address: "",
  whatTheySell: "",
  description: "",
  whyJoin: ""
};

type FieldErrors = Partial<Record<keyof typeof defaultForm, string[]>>;

export function VerifiedSellerApplicationForm() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const response = await fetch("/api/verified-seller-applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    const data = (await response.json().catch(() => null)) as
      | { message?: string; errors?: { fieldErrors?: FieldErrors } }
      | null;
    setLoading(false);

    if (!response.ok) {
      setFieldErrors(data?.errors?.fieldErrors ?? {});
      setError(data?.message || "Could not submit your application right now.");
      return;
    }

    setSubmitted(data?.message || "Your application is in. We'll reach out after review.");
    setForm(defaultForm);
    setFieldErrors({});
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-3">
          <p className="editorial-eyebrow">Verified Shop application</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Bring your local racks onto HoosFinds.
          </h1>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            HoosFinds is still UVA-first on the buyer side. Verified Shops are reviewed local thrift, vintage, and curated
            resale partners we trust to sell into that student marketplace.
          </p>
        </div>

        <Card className="surface-panel-strong">
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.3rem] border border-border bg-background/70 px-4 py-4">
                <p className="editorial-eyebrow">1</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Apply</p>
                <p className="mt-1 text-sm text-muted-foreground">Tell us about your shop, style, and local footprint.</p>
              </div>
              <div className="rounded-[1.3rem] border border-border bg-background/70 px-4 py-4">
                <p className="editorial-eyebrow">2</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Reviewed by HoosFinds</p>
                <p className="mt-1 text-sm text-muted-foreground">We manually approve trusted local resale partners.</p>
              </div>
              <div className="rounded-[1.3rem] border border-border bg-background/70 px-4 py-4">
                <p className="editorial-eyebrow">3</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Sell as a Verified Shop</p>
                <p className="mt-1 text-sm text-muted-foreground">Your listings use the same HoosFinds marketplace flow buyers already trust.</p>
              </div>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Buyers stay exclusive to UVA students. Verified Shops expand the inventory without turning HoosFinds into a generic marketplace.
            </p>
          </CardContent>
        </Card>
      </div>

      {submitted ? (
        <Card className="surface-panel-strong">
          <CardContent className="space-y-4 p-6">
            <p className="font-display text-3xl font-extrabold tracking-tight">Application received.</p>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{submitted}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/sign-in">Back to sign in</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/market">Browse HoosFinds</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="surface-panel-strong">
        <CardContent className="p-6 md:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business / shop name</Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(event) => setForm((prev) => ({ ...prev, businessName: event.target.value }))}
                  placeholder="Blue Ridge Vintage"
                  required
                />
                {fieldErrors.businessName?.[0] ? <p className="text-sm text-destructive">{fieldErrors.businessName[0]}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact person</Label>
                <Input
                  id="contactName"
                  value={form.contactName}
                  onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))}
                  placeholder="Jamie Carter"
                  required
                />
                {fieldErrors.contactName?.[0] ? <p className="text-sm text-destructive">{fieldErrors.contactName[0]}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="shop@example.com"
                  required
                />
                {fieldErrors.email?.[0] ? <p className="text-sm text-destructive">{fieldErrors.email[0]}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="(434) 555-0123"
                  required
                />
                {fieldErrors.phone?.[0] ? <p className="text-sm text-destructive">{fieldErrors.phone[0]}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={form.instagram}
                  onChange={(event) => setForm((prev) => ({ ...prev, instagram: event.target.value }))}
                  placeholder="@blueridgevintage"
                  required
                />
                {fieldErrors.instagram?.[0] ? <p className="text-sm text-destructive">{fieldErrors.instagram[0]}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                  placeholder="https://example.com"
                />
                {fieldErrors.website?.[0] ? <p className="text-sm text-destructive">{fieldErrors.website[0]}</p> : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="neighborhood">Neighborhood</Label>
                <Input
                  id="neighborhood"
                  value={form.neighborhood}
                  onChange={(event) => setForm((prev) => ({ ...prev, neighborhood: event.target.value }))}
                  placeholder="Downtown Charlottesville"
                  required
                />
                {fieldErrors.neighborhood?.[0] ? (
                  <p className="text-sm text-destructive">{fieldErrors.neighborhood[0]}</p>
                ) : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Exact shop address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="123 W Main St, Charlottesville, VA 22902"
                  required
                />
                {fieldErrors.address?.[0] ? <p className="text-sm text-destructive">{fieldErrors.address[0]}</p> : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="whatTheySell">What do you sell?</Label>
                <Input
                  id="whatTheySell"
                  value={form.whatTheySell}
                  onChange={(event) => setForm((prev) => ({ ...prev, whatTheySell: event.target.value }))}
                  placeholder="Vintage denim, collegiate sweats, curated accessories"
                  required
                />
                {fieldErrors.whatTheySell?.[0] ? <p className="text-sm text-destructive">{fieldErrors.whatTheySell[0]}</p> : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Short shop description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Tell us the point of view behind your shop."
                  required
                />
                {fieldErrors.description?.[0] ? <p className="text-sm text-destructive">{fieldErrors.description[0]}</p> : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="whyJoin">Why do you want to join HoosFinds?</Label>
                <Textarea
                  id="whyJoin"
                  value={form.whyJoin}
                  onChange={(event) => setForm((prev) => ({ ...prev, whyJoin: event.target.value }))}
                  placeholder="Why is HoosFinds the right fit for your shop and the UVA audience?"
                  required
                />
                {fieldErrors.whyJoin?.[0] ? <p className="text-sm text-destructive">{fieldErrors.whyJoin[0]}</p> : null}
              </div>
            </div>

            {error ? (
              <div className="rounded-[1.15rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Submitting application..." : "Apply as a Verified Shop"}
              </Button>
              <Button asChild type="button" variant="secondary" size="lg">
                <Link href="/sign-in">Back to sign in</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
