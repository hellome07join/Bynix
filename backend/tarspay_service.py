"""
TarsPay Payment Gateway Service for Bangladesh (bKash, Nagad)
API Documentation: https://apifox.com/apidoc/shared-4c352e19-e446-4150-bb64-ea713bdd5667/doc-5106899
"""

import os
import time
import hashlib
import httpx
import asyncio
from typing import Optional, Dict, Any
from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError
from ecdsa.util import sigencode_der, sigdecode_der
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# TarsPay Configuration
TARSPAY_BASE_URL = os.getenv("TARSPAY_API_URL", "https://payment.tarspay.com")
TARSPAY_MCH_NO = os.getenv("TARSPAY_MERCHANT_ID", "M1023")
TARSPAY_PRIVATE_KEY = os.getenv("TARSPAY_PRIVATE_KEY", "")
TARSPAY_PUBLIC_KEY = os.getenv("TARSPAY_PUBLIC_KEY", "")
TARSPAY_SYSTEM_PUBLIC_KEY = os.getenv("TARSPAY_SYSTEM_PUBLIC_KEY", "03029c655932f22aee81034d109795fbd7e23ca173ca27e195091d434e593a2e0f")

# Default exchange rate (fixed at 120 BDT per USD as per user request)
USD_TO_BDT = int(os.getenv("BDT_TO_USD_RATE", "120"))
_cached_rate = {"rate": USD_TO_BDT, "last_updated": 0}

async def fetch_live_exchange_rate() -> float:
    """Fetch live USD to BDT exchange rate from multiple sources"""
    global _cached_rate
    
    # Cache for 30 minutes
    current_time = time.time()
    if current_time - _cached_rate["last_updated"] < 1800:
        return _cached_rate["rate"]
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Try ExchangeRate-API (free tier)
            try:
                response = await client.get("https://api.exchangerate-api.com/v4/latest/USD")
                if response.status_code == 200:
                    data = response.json()
                    rate = data.get("rates", {}).get("BDT", 120)
                    _cached_rate = {"rate": rate, "last_updated": current_time}
                    print(f"TarsPay: Live exchange rate fetched: 1 USD = {rate} BDT")
                    return rate
            except Exception as e:
                print(f"TarsPay: ExchangeRate-API error: {e}")
            
            # Fallback: Try Open Exchange Rates
            try:
                response = await client.get("https://open.er-api.com/v6/latest/USD")
                if response.status_code == 200:
                    data = response.json()
                    rate = data.get("rates", {}).get("BDT", 120)
                    _cached_rate = {"rate": rate, "last_updated": current_time}
                    print(f"TarsPay: Fallback rate fetched: 1 USD = {rate} BDT")
                    return rate
            except Exception as e:
                print(f"TarsPay: Fallback API error: {e}")
                
    except Exception as e:
        print(f"TarsPay: Exchange rate fetch failed: {e}")
    
    # Return cached or default rate
    return _cached_rate["rate"]

def get_current_rate() -> float:
    """Get current cached exchange rate"""
    return _cached_rate["rate"]

# Payment channels - Min $10 USD = 1200 BDT at 120 BDT/USD rate
TARSPAY_CHANNELS = {
    "bkash": {
        "wayCode": "EWALLET_BKASH",
        "name": "bKash",
        "min_bdt": 1200,  # $10 minimum
        "max_bdt": 30000,
        "logo": "https://defipay.oss-ap-southeast-1.aliyuncs.com/bKash.png"
    },
    "nagad": {
        "wayCode": "EWALLET_NAGAD",
        "name": "Nagad",
        "min_bdt": 1200,  # $10 minimum
        "max_bdt": 30000,
        "logo": "https://defipay.oss-ap-southeast-1.aliyuncs.com/nagad.png"
    }
}


class TarsPayService:
    def __init__(self):
        self.base_url = TARSPAY_BASE_URL
        self.mch_no = TARSPAY_MCH_NO
        self.private_key_hex = TARSPAY_PRIVATE_KEY
        self.public_key_hex = TARSPAY_PUBLIC_KEY
        self.system_public_key_hex = TARSPAY_SYSTEM_PUBLIC_KEY
        
        # Initialize signing key
        try:
            private_key_bytes = bytes.fromhex(self.private_key_hex)
            self.signing_key = SigningKey.from_string(private_key_bytes, curve=SECP256k1)
            print(f"TarsPay: Signing key initialized successfully")
        except Exception as e:
            print(f"TarsPay: Error initializing signing key: {e}")
            self.signing_key = None
    
    def _sha256_double(self, data: bytes) -> bytes:
        """Double SHA256 hash as required by TarsPay"""
        first_hash = hashlib.sha256(data).digest()
        return hashlib.sha256(first_hash).digest()
    
    def _sort_params(self, params: Dict[str, Any]) -> str:
        """Sort parameters alphabetically and create query string"""
        # Filter out None/empty values
        filtered = {k: v for k, v in params.items() if v is not None and v != ""}
        # Sort by key
        sorted_items = sorted(filtered.items(), key=lambda x: x[0])
        # Create query string
        return "&".join([f"{k}={v}" for k, v in sorted_items])
    
    def _create_signature(self, method: str, path: str, timestamp: int, params: Dict[str, Any]) -> str:
        """
        Create ECDSA signature for TarsPay API
        Format: METHOD|PATH|TIMESTAMP|PARAMS
        """
        if not self.signing_key:
            raise Exception("Signing key not initialized")
        
        # Build signature string
        params_str = self._sort_params(params)
        sign_data = f"{method}|{path}|{timestamp}|{params_str}"
        print(f"TarsPay Sign Data: {sign_data}")
        
        # Double SHA256 then sign
        data_hash = self._sha256_double(sign_data.encode('utf-8'))
        
        # Sign with ECDSA
        signature = self.signing_key.sign(data_hash, sigencode=sigencode_der)
        
        return signature.hex()
    
    def verify_callback_signature(self, content: str, signature_hex: str) -> bool:
        """Verify callback signature from TarsPay"""
        try:
            # Use system public key for verification
            pub_key_bytes = bytes.fromhex(self.system_public_key_hex)
            verifying_key = VerifyingKey.from_string(pub_key_bytes, curve=SECP256k1)
            
            # Double SHA256
            data_hash = self._sha256_double(content.encode('utf-8'))
            signature = bytes.fromhex(signature_hex)
            
            return verifying_key.verify(signature, data_hash, sigdecode=sigdecode_der)
        except BadSignatureError:
            return False
        except Exception as e:
            print(f"TarsPay: Signature verification error: {e}")
            return False
    
    async def create_deposit_order(
        self,
        order_id: str,
        amount_usd: float,
        channel: str = "bkash",
        customer_phone: Optional[str] = None,
        notify_url: str = "",
        return_url: str = ""
    ) -> Dict[str, Any]:
        """
        Create a deposit order with TarsPay
        
        Args:
            order_id: Unique merchant order ID
            amount_usd: Amount in USD
            channel: Payment channel (bkash, nagad, bkash_official)
            customer_phone: Customer's phone/wallet number
            notify_url: Callback URL for payment notification
            return_url: URL to redirect after payment
        
        Returns:
            API response with payment URL and order details
        """
        # Get channel config
        channel_config = TARSPAY_CHANNELS.get(channel, TARSPAY_CHANNELS["bkash"])
        way_code = channel_config["wayCode"]
        
        # Fetch live exchange rate
        exchange_rate = await fetch_live_exchange_rate()
        
        # Convert USD to BDT
        amount_bdt = int(amount_usd * exchange_rate)
        
        # Validate amount limits
        if amount_bdt < channel_config["min_bdt"]:
            return {
                "success": False,
                "error": f"Minimum amount is {channel_config['min_bdt']} BDT (${channel_config['min_bdt'] / USD_TO_BDT:.2f} USD)"
            }
        if amount_bdt > channel_config["max_bdt"]:
            return {
                "success": False,
                "error": f"Maximum amount is {channel_config['max_bdt']} BDT (${channel_config['max_bdt'] / USD_TO_BDT:.2f} USD)"
            }
        
        # Prepare request
        path = "/api/pay/unifiedOrder"
        timestamp = int(time.time() * 1000)
        
        params = {
            "amount": str(amount_bdt),
            "currency": "BDT",
            "mchNo": self.mch_no,
            "mchOrderNo": order_id,
            "notifyUrl": notify_url,
            "wayCode": way_code
        }
        
        if customer_phone:
            params["customerContact"] = customer_phone
        if return_url:
            params["returnUrl"] = return_url
        
        # Create signature
        try:
            signature = self._create_signature("POST", path, timestamp, params)
        except Exception as e:
            print(f"TarsPay: Signature creation error: {e}")
            return {"success": False, "error": f"Signature error: {str(e)}"}
        
        # Make API request
        headers = {
            "Content-Type": "application/json",
            "X-API-KEY": self.public_key_hex,
            "X-API-NONCE": str(timestamp),
            "X-API-SIGNATURE": signature
        }
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.base_url}{path}",
                    json=params,
                    headers=headers
                )
                
                data = response.json()
                print(f"TarsPay Response: {data}")
                
                if data.get("code") == 0:
                    resp_data = data.get("data", {})
                    return {
                        "success": True,
                        "payment_id": resp_data.get("payOrderId"),
                        "order_id": order_id,
                        "amount_bdt": amount_bdt,
                        "amount_usd": amount_usd,
                        "pay_url": resp_data.get("payUrl"),
                        "pay_data": resp_data.get("payData"),
                        "pay_data_type": resp_data.get("payDataType"),
                        "channel": channel,
                        "channel_name": channel_config["name"],
                        "status": "pending",
                        "expired_time": resp_data.get("expiredTime")
                    }
                else:
                    return {
                        "success": False,
                        "error": data.get("msg", "Unknown error")
                    }
                    
        except Exception as e:
            print(f"TarsPay: API request error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_order_status(self, order_id: str) -> Dict[str, Any]:
        """
        Get deposit order status
        
        Args:
            order_id: Merchant order ID
        
        Returns:
            Order status information
        """
        path = "/api/pay/query"
        timestamp = int(time.time() * 1000)
        
        params = {
            "mchNo": self.mch_no,
            "mchOrderNo": order_id
        }
        
        try:
            signature = self._create_signature("POST", path, timestamp, params)
        except Exception as e:
            return {"success": False, "error": f"Signature error: {str(e)}"}
        
        headers = {
            "Content-Type": "application/json",
            "X-API-KEY": self.public_key_hex,
            "X-API-NONCE": str(timestamp),
            "X-API-SIGNATURE": signature
        }
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.base_url}{path}",
                    json=params,
                    headers=headers
                )
                
                data = response.json()
                
                if data.get("code") == 0:
                    resp_data = data.get("data", {})
                    # Order states: 1=pending, 2=success, 3=failed, 4=expired
                    order_state = resp_data.get("orderState", 0)
                    status_map = {1: "pending", 2: "success", 3: "failed", 4: "expired"}
                    
                    return {
                        "success": True,
                        "payment_id": resp_data.get("payOrderId"),
                        "order_id": order_id,
                        "status": status_map.get(order_state, "unknown"),
                        "amount_bdt": resp_data.get("amount"),
                        "paid": order_state == 2
                    }
                else:
                    return {"success": False, "error": data.get("msg", "Unknown error")}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_channels(self) -> list:
        """Get available payment channels with limits"""
        channels = []
        for key, config in TARSPAY_CHANNELS.items():
            channels.append({
                "id": key,
                "name": config["name"],
                "wayCode": config["wayCode"],
                "min_usd": round(config["min_bdt"] / USD_TO_BDT, 2),
                "max_usd": round(config["max_bdt"] / USD_TO_BDT, 2),
                "min_bdt": config["min_bdt"],
                "max_bdt": config["max_bdt"],
                "logo": config["logo"]
            })
        return channels


# Global instance
tarspay_service = TarsPayService()
