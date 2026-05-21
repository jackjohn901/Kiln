import React, { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Users, Calendar, CheckCircle2 } from "lucide-react";

interface Reservation {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  expectedDate: string;
  interestCount: number;
  isInterested: boolean;
  createdAt: string;
}

export default function ReserveList() {
  const { id: artistId } = useParams<{ id: string }>();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReservations();
  }, [artistId]);

  const fetchReservations = async () => {
    try {
      const res = await fetch(`/api/artists/${artistId}/reservations`);
      if (!res.ok) throw new Error("Failed to load reservations");
      const data = await res.json();
      setReservations(data.reservations);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not load reserve list", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = async (reservation: Reservation) => {
    try {
      const method = reservation.isInterested ? "DELETE" : "POST";
      const res = await fetch(`/api/work-reservations/${reservation.id}/interest`, { method });
      if (!res.ok) throw new Error("Failed to update interest");

      setReservations(prev => prev.map(r => {
        if (r.id === reservation.id) {
          return {
            ...r,
            isInterested: !r.isInterested,
            interestCount: r.isInterested ? r.interestCount - 1 : r.interestCount + 1
          };
        }
        return r;
      }));

      toast({
        title: reservation.isInterested ? "Interest removed" : "You're on the list!",
        description: reservation.isInterested ? "You've been removed from the reserve list." : "We'll notify you when this work is available."
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not update interest", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link to={`/profile/${artistId}`} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Profile
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Reserve Upcoming Work</h1>
        <p className="text-muted-foreground italic">
          Be the first to know when these pieces by {reservations[0]?.artistName || "the artist"} are ready.
        </p>
      </div>

      {reservations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No active reserve lists</h3>
            <p className="text-muted-foreground">This artist doesn't have any upcoming work listed for reservation yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reservations.map(res => (
            <Card key={res.id} className="overflow-hidden flex flex-col">
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                {res.imageUrl ? (
                  <img src={res.imageUrl} alt={res.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-400 opacity-50 flex items-center justify-center">
                    <span className="text-stone-500 font-medium">Coming Soon</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                    <Calendar className="w-3 h-3 mr-1" />
                    {res.expectedDate}
                  </Badge>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{res.title}</CardTitle>
                {res.description && (
                  <CardDescription className="line-clamp-2">{res.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-1" />
                    {res.interestCount} interested
                  </div>
                  <Button
                    variant={res.isInterested ? "secondary" : "default"}
                    onClick={() => toggleInterest(res)}
                    className="flex-1"
                  >
                    {res.isInterested ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                        Reserved
                      </>
                    ) : (
                      "Reserve my spot"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
