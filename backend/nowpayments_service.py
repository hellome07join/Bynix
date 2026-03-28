"""
NOWPayments Payout Service for USDT TRC20 Withdrawals
API Documentation: https://documenter.getpostman.com/view/7907941/2s93JusNJt
"""

import os
import httpx
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

NOWPAYMENTS_API_KEY = os.environ.get("NOWPAYMENTS_API_KEY", "")
NOWPAYMENTS_IPN_SECRET = os.environ.get("NOWPAYMENTS_IPN_SECRET", "")
NOWPAYMENTS_BASE_URL = "https://api.nowpayments.io/v1"

class NOWPaymentsService:
    """Service class for NOWPayments Payout API"""
    
    def __init__(self):
        self.api_key = NOWPAYMENTS_API_KEY
        self.base_url = NOWPAYMENTS_BASE_URL
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def get_status(self) -> Dict[str, Any]:
        """Check NOWPayments API status"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{self.base_url}/status",
                    headers=self.headers
                )
                return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    async def get_available_currencies(self) -> Dict[str, Any]:
        """Get list of available currencies for payout"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{self.base_url}/payout/currencies",
                    headers=self.headers
                )
                return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    async def get_minimum_payout(self, currency: str = "usdttrc20") -> Dict[str, Any]:
        """Get minimum payout amount for a currency"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{self.base_url}/payout/min-amount?currency={currency}",
                    headers=self.headers
                )
                return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    async def validate_address(self, address: str, currency: str = "usdttrc20") -> Dict[str, Any]:
        """Validate a crypto address before payout"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.base_url}/payout/validate-address",
                    headers=self.headers,
                    json={
                        "address": address,
                        "currency": currency
                    }
                )
                data = response.json()
                # If response contains result: true, address is valid
                return data
        except Exception as e:
            return {"error": str(e), "result": False}
    
    async def get_balance(self) -> Dict[str, Any]:
        """Get NOWPayments account balance"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{self.base_url}/balance",
                    headers=self.headers
                )
                return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    async def create_payout(
        self,
        address: str,
        amount: float,
        currency: str = "usdttrc20",
        ipn_callback_url: Optional[str] = None,
        unique_external_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a payout request to send USDT TRC20
        
        Args:
            address: Recipient's TRC20 wallet address (starts with T)
            amount: Amount in USDT to send
            currency: Currency code (default: usdttrc20)
            ipn_callback_url: URL to receive payment notifications
            unique_external_id: Your unique identifier for this payout
        
        Returns:
            Payout response with id, status, etc.
        """
        try:
            payload = {
                "address": address,
                "amount": amount,
                "currency": currency,
                "ipn_callback_url": ipn_callback_url
            }
            
            if unique_external_id:
                payload["unique_external_id"] = unique_external_id
            
            # Remove None values
            payload = {k: v for k, v in payload.items() if v is not None}
            
            print(f"[NOWPayments] Creating payout: {payload}")
            
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    f"{self.base_url}/payout",
                    headers=self.headers,
                    json=payload
                )
                
                data = response.json()
                print(f"[NOWPayments] Payout response: {data}")
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "data": data
                }
        except Exception as e:
            print(f"[NOWPayments] Payout error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_payout_status(self, payout_id: str) -> Dict[str, Any]:
        """
        Get the status of a payout
        
        Args:
            payout_id: The NOWPayments payout ID
            
        Returns:
            Payout details including status
        """
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{self.base_url}/payout/{payout_id}",
                    headers=self.headers
                )
                return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    async def get_payouts_list(
        self,
        limit: int = 10,
        page: int = 0,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get list of payouts
        
        Args:
            limit: Number of results per page
            page: Page number
            status: Filter by status (waiting, confirming, sending, finished, failed)
        """
        try:
            params = {
                "limit": limit,
                "page": page
            }
            if status:
                params["status"] = status
                
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{self.base_url}/payout",
                    headers=self.headers,
                    params=params
                )
                return response.json()
        except Exception as e:
            return {"error": str(e)}


# Singleton instance
nowpayments_service = NOWPaymentsService()


# Helper functions for quick access
async def create_usdt_payout(
    address: str,
    amount: float,
    external_id: Optional[str] = None,
    callback_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Quick helper to create USDT TRC20 payout
    
    Args:
        address: TRC20 wallet address
        amount: Amount in USDT
        external_id: Your unique reference ID
        callback_url: Webhook URL for status updates
    """
    return await nowpayments_service.create_payout(
        address=address,
        amount=amount,
        currency="usdttrc20",
        unique_external_id=external_id,
        ipn_callback_url=callback_url
    )


async def check_payout_status(payout_id: str) -> Dict[str, Any]:
    """Quick helper to check payout status"""
    return await nowpayments_service.get_payout_status(payout_id)


async def validate_trc20_address(address: str) -> bool:
    """Validate if address is a valid TRC20 address"""
    # Basic TRC20 address validation
    if not address or len(address) != 34 or not address.startswith('T'):
        return False
    
    # Also validate via NOWPayments API
    result = await nowpayments_service.validate_address(address, "usdttrc20")
    return result.get("result", False) or result.get("isValid", False)


async def get_nowpayments_balance() -> Dict[str, Any]:
    """Get NOWPayments account balance"""
    return await nowpayments_service.get_balance()
