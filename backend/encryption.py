from phe import paillier
import json

# Generate a single keypair for the simulation
public_key, private_key = paillier.generate_paillier_keypair()


def encrypt_weights(weights: dict) -> dict:
    """Encrypt model weights using Paillier homomorphic encryption."""
    encrypted = {}
    for key, value in weights.items():
        # Scale float to int for encryption (phe works with numbers)
        encrypted[key] = public_key.encrypt(float(value))
    return encrypted


def decrypt_weights(encrypted_weights: dict) -> dict:
    """Decrypt model weights."""
    decrypted = {}
    for key, enc_value in encrypted_weights.items():
        decrypted[key] = private_key.decrypt(enc_value)
    return decrypted


def add_encrypted_weights(enc_a: dict, enc_b: dict) -> dict:
    """Add two sets of encrypted weights (HE addition without decryption)."""
    result = {}
    for key in enc_a:
        result[key] = enc_a[key] + enc_b[key]
    return result


def serialize_encrypted(encrypted_weights: dict) -> dict:
    """Serialize encrypted weights to JSON-compatible format."""
    serialized = {}
    for key, enc_val in encrypted_weights.items():
        serialized[key] = {
            "ciphertext": str(enc_val.ciphertext()),
            "exponent": enc_val.exponent
        }
    return serialized


def deserialize_encrypted(serialized: dict) -> dict:
    """Deserialize encrypted weights from JSON format."""
    deserialized = {}
    for key, val in serialized.items():
        enc_num = paillier.EncryptedNumber(
            public_key,
            int(val["ciphertext"]),
            int(val["exponent"])
        )
        deserialized[key] = enc_num
    return deserialized


def garble_text(serialized: dict) -> str:
    """Return a garbled string representation for UI display."""
    import random
    import string
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    garbled_parts = []
    for key in list(serialized.keys())[:3]:
        length = random.randint(20, 40)
        garbled = ''.join(random.choices(chars, k=length))
        garbled_parts.append(f"{key}: {garbled}...")
    return "\n".join(garbled_parts)
