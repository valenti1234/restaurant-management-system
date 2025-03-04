import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Linkedin, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SocialShareProps {
  title: string;
  description?: string;
  imageUrl?: string;
}

export function SocialShare({ title, description, imageUrl }: SocialShareProps) {
  const currentUrl = window.location.href;
  
  const shareData = {
    title,
    text: description,
    url: currentUrl,
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully",
          description: "The menu item has been shared.",
        });
      } else {
        throw new Error("Web Share API not supported");
      }
    } catch (error) {
      // Fallback to showing share buttons
      const shareBtns = document.getElementById("share-buttons");
      if (shareBtns) {
        shareBtns.style.display = "flex";
      }
    }
  };

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(currentUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full"
        onClick={handleShare}
      >
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>

      <div 
        id="share-buttons" 
        className="hidden items-center gap-2"
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.open(shareUrls.facebook, '_blank')}
          title="Share on Facebook"
        >
          <Facebook className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.open(shareUrls.twitter, '_blank')}
          title="Share on Twitter"
        >
          <Twitter className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.open(shareUrls.linkedin, '_blank')}
          title="Share on LinkedIn"
        >
          <Linkedin className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
