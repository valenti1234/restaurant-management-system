import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Review, InsertReview } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReviewSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Star, StarHalf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MenuItemReviewsProps {
  menuItemId: number;
}

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
}

function StarRating({ value, onChange }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="hover:scale-110 transition-transform"
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(null)}
          onClick={() => onChange(star)}
        >
          <Star
            className={`h-6 w-6 ${
              star <= displayValue
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function MenuItemReviews({ menuItemId }: MenuItemReviewsProps) {
  const [isAddingReview, setIsAddingReview] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ['/api/menu', menuItemId, 'reviews'],
    enabled: !!menuItemId,
  });

  const { data: averageRating } = useQuery<number>({
    queryKey: ['/api/menu', menuItemId, 'average-rating'],
    enabled: !!menuItemId,
  });

  const form = useForm<InsertReview>({
    resolver: zodResolver(insertReviewSchema),
    defaultValues: {
      menuItemId,
      rating: 5,
      review: "",
      authorName: "",
    },
  });

  const { mutate: submitReview, isPending } = useMutation({
    mutationFn: async (data: InsertReview) => {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit review');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu', menuItemId, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/menu', menuItemId, 'average-rating'] });
      setIsAddingReview(false);
      form.reset();
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-primary text-primary" />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="h-4 w-4 fill-primary text-primary" />);
    }

    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground" />);
    }

    return stars;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Customer Reviews</h3>
          {typeof averageRating === 'number' && (
            <div className="flex items-center gap-1">
              {renderStars(averageRating)}
              <span className="text-sm text-muted-foreground">
                ({averageRating?.toFixed(1) || '0.0'})
              </span>
            </div>
          )}
        </div>
        {!isAddingReview && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingReview(true)}
          >
            Add Review
          </Button>
        )}
      </div>

      {isAddingReview && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => submitReview(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="authorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <StarRating 
                      value={field.value} 
                      onChange={(value) => field.onChange(value)} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="review"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                Submit Review
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingReview(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      )}

      <div className="space-y-4">
        {reviews?.map((review) => (
          <div key={review.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{review.authorName}</span>
              <div className="flex items-center">
                {renderStars(review.rating)}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{review.review}</p>
          </div>
        ))}
      </div>
    </div>
  );
}