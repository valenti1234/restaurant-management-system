import { createContext, useContext, useReducer, ReactNode } from "react";
import { MenuItem } from "@shared/schema";

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { menuItemId: number } }
  | { type: "UPDATE_QUANTITY"; payload: { menuItemId: number; quantity: number } }
  | { type: "CLEAR_CART" };

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  addToCart: (menuItem: MenuItem) => void;
  removeFromCart: (menuItemId: number) => void;
  getItemQuantity: (menuItemId: number) => number;
}

const CartContext = createContext<CartContextType | null>(null);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItemIndex = state.items.findIndex(
        item => item.menuItem.id === action.payload.menuItem.id
      );

      if (existingItemIndex > -1) {
        const newItems = [...state.items];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + action.payload.quantity,
          specialInstructions: action.payload.specialInstructions
        };
        return { ...state, items: newItems };
      }

      return { ...state, items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(item => item.menuItem.id !== action.payload.menuItemId)
      };
    case "UPDATE_QUANTITY": {
      const newItems = state.items.map(item =>
        item.menuItem.id === action.payload.menuItemId
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return { ...state, items: newItems };
    }
    case "CLEAR_CART":
      return { ...state, items: [] };
    default:
      return state;
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addToCart = (menuItem: MenuItem) => {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        menuItem,
        quantity: 1,
      },
    });
  };

  const removeFromCart = (menuItemId: number) => {
    dispatch({
      type: "REMOVE_ITEM",
      payload: { menuItemId },
    });
  };

  const getItemQuantity = (menuItemId: number) => {
    const item = state.items.find(item => item.menuItem.id === menuItemId);
    return item?.quantity || 0;
  };

  return (
    <CartContext.Provider value={{ 
      state, 
      dispatch, 
      addToCart,
      removeFromCart,
      getItemQuantity
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};