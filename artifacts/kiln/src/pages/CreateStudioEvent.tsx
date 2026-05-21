import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function CreateStudioEvent() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    durationMins: 60,
    maxAttendees: 20,
    price: 0,
    isFree: true,
    location: "",
    address: "",
    isVirtual: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/studio-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: formData.isFree ? 0 : formData.price,
        }),
      });

      if (res.ok) {
        toast({
          title: "Event Created!",
          description: "Your studio open day has been scheduled.",
        });
        setLocation("/studio-open-days");
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to create event",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8 max-w-2xl">
      <Button 
        variant="ghost" 
        onClick={() => setLocation("/studio-open-days")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Open Days
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Host a Studio Open Day</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                required
                placeholder="e.g. Summer Studio Tour & Glass Blowing Demo"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                required
                placeholder="Tell your fans what they can expect from this visit..."
                className="min-h-[120px]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date & Time</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  required
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  required
                  min={1}
                  value={formData.durationMins}
                  onChange={(e) => setFormData({ ...formData, durationMins: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxAttendees">Max Attendees</Label>
                <Input
                  id="maxAttendees"
                  type="number"
                  required
                  min={1}
                  value={formData.maxAttendees}
                  onChange={(e) => setFormData({ ...formData, maxAttendees: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isFree">Free Event</Label>
                  <Switch
                    id="isFree"
                    checked={formData.isFree}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFree: checked })}
                  />
                </div>
                {!formData.isFree && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (cents)</Label>
                    <Input
                      id="price"
                      type="number"
                      required
                      min={0}
                      placeholder="e.g. 1500 for $15.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Virtual Event</Label>
                  <p className="text-sm text-muted-foreground">This event will take place online</p>
                </div>
                <Switch
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) => setFormData({ ...formData, isVirtual: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location Name</Label>
                <Input
                  id="location"
                  required
                  placeholder={formData.isVirtual ? "e.g. Zoom / Instagram Live" : "e.g. My Downtown Studio"}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address / Access Info</Label>
                <Input
                  id="address"
                  required
                  placeholder={formData.isVirtual ? "The meeting link will be sent to attendees" : "e.g. 123 Artsy Lane, Suite 4"}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Schedule Open Day"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
