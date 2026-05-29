import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface StudioEvent {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatarUrl?: string;
  title: string;
  description: string;
  eventDate: string;
  durationMins: number;
  maxAttendees: number;
  attendeeCount: number;
  price: number;
  location: string;
  address: string;
  isVirtual: boolean;
  status: string;
}


export default function StudioOpenDays() {
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/studio-events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to RSVP for events.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(`/api/studio-events/${eventId}/attend`, {
        method: "POST",
      });
      if (res.ok) {
        toast({
          title: "RSVP Successful",
          description: "You're on the list!",
        });
        fetchEvents();
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to RSVP",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Studio Open Days</h1>
          <p className="text-muted-foreground">Visit artists in their natural habitat.</p>
        </div>
        <Button onClick={() => window.location.href = "/create-studio-event"}>
          Host an Open Day
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => {
          const spotsLeft = event.maxAttendees - event.attendeeCount;
          const isFull = spotsLeft <= 0;

          return (
            <Card key={event.id} className="overflow-hidden flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={event.artistAvatarUrl} />
                    <AvatarFallback>{event.artistName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">by {event.artistName}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(event.eventDate), "EEE MMM d · h:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.isVirtual ? (
                      <Video className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Badge variant={isFull ? "destructive" : "secondary"}>
                      {isFull ? "Fully Booked" : `${spotsLeft} spots left`}
                    </Badge>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm line-clamp-2 text-muted-foreground">
                    {event.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="font-bold text-lg">
                    {event.price === 0 ? "Free" : `$${(event.price / 100).toFixed(2)}`}
                  </span>
                  <Button 
                    disabled={isFull}
                    onClick={() => handleRSVP(event.id)}
                  >
                    {isFull ? "Sold Out" : "RSVP Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {events.length === 0 && !loading && (
        <div className="text-center py-20">
          <p className="text-xl text-muted-foreground">No upcoming open days found.</p>
        </div>
      )}
    </div>
  );
}
