import { toast } from "@/hooks/use-toast";
import { ErrorResponse, isErrorResponse } from "@shared/errors";

export function handleError(error: unknown, fallbackMessage = "An unexpected error occurred") {
  console.error("Error:", error);

  let title = "Error";
  let description = fallbackMessage;

  if (error instanceof Error) {
    const errorObj = error as Error & { details?: any };
    description = errorObj.message;
    
    // Log additional details if available
    if (errorObj.details) {
      console.error("Error details:", errorObj.details);
    }
  } else if (isErrorResponse(error)) {
    const errorResponse = error as ErrorResponse;
    description = errorResponse.message;
    
    if (errorResponse.details) {
      console.error("Error details:", errorResponse.details);
    }

    // Customize title based on error code
    switch (errorResponse.code) {
      case "VALIDATION_ERROR":
        title = "Validation Error";
        break;
      case "UNAUTHORIZED":
        title = "Authentication Required";
        break;
      case "FORBIDDEN":
        title = "Access Denied";
        break;
      case "NOT_FOUND":
        title = "Not Found";
        break;
      case "CONFLICT":
        title = "Conflict";
        break;
      default:
        title = "Error";
    }
  }

  // Show toast notification
  toast({
    title,
    description,
    variant: "destructive",
  });
} 