#![no_std]
use soroban_sdk::{contracttype, contracterror, symbol_short, Env,Symbol};
use core::primitive::u64;




/**
 * @dev Storage of the initializable contract.
 *
 * It's implemented on a custom ERC-7201 namespace to reduce the risk of storage collisions
 * when using with upgradeable contracts.
 *
 * @custom:storage-location erc7201:openzeppelin.storage.Initializable
 */

#[contracttype]
#[derive(Clone)]
pub struct InitializableStorage {
    initialized: u64,
    initializing: bool,
}


impl InitializableStorage {
    fn new() -> Self {
        Self {
            initialized: 0,
            initializing: false,
        }
    }
}

// keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Initializable")) - 1)) & ~bytes32(uint256(0xff))
pub const INITIALIZABLE_STORAGE: [u8; 32] = [
    0xf0, 0xc5, 0x7e, 0x16, 0x84, 0x0d, 0xf0, 0x40,
    0xf1, 0x50, 0x88, 0xdc, 0x2f, 0x81, 0xfe, 0x39,
    0x1c, 0x39, 0x23, 0xbe, 0xc7, 0x3e, 0x23, 0xa9,
    0x66, 0x2e, 0xfc, 0x9c, 0x22, 0x9c, 0x6a, 0x00,
];

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    InvalidInitialization = 1, // @dev The contract is already initialized.
    NotInitializing = 2,    //  @dev The contract is not initializing.
}

const COUNTER: Symbol = symbol_short!("COUNTER");

//TODO: check which storage actullay need env storage or stuct storage
pub struct Initializable {
    storage: InitializableStorage,
}

impl Initializable {

    pub fn new(env: Env) -> Self {
        Self {
            storage: InitializableStorage::new(),
        }
    }

    // A protected initializer function that can be invoked at most once.
    pub fn initializer(&mut self, env: Env) -> Result<(), ContractError> {
        let is_top_level_call = !self.storage.initializing;
        let initialized = self.storage.initialized;


        // Allowed calls:
        // - initialSetup: the contract is not in the initializing state and no previous version was
        //                 initialized
        // - construction: the contract is initialized at version 1 (no reininitialization) and the
        //                 current contract is just being deployed
        let is_initial_setup = initialized < 1 && is_top_level_call;
        let construction = initialized == 1;     //TODO: need to check and add code length but can not found which one is code

         if !is_initial_setup && !construction {
            return Err(ContractError::InvalidInitialization);
        }


        // assert_with_error!(
        //     &env,
        //     !initial_setup && !construction,
        //     ContractError::InvalidInitialization
        // );

        self.storage.initialized = 1;
        if is_top_level_call {
            self.storage.initializing = true;
        }

        
        self.storage.initializing = false;

        env.events()
            .publish((COUNTER, symbol_short!("initial")), 1);

        Ok(())
    }

    // A protected reinitializer function that can be invoked at most once.
    pub fn reinitializer(&mut self, env: Env, version: u64) -> Result<(), ContractError> {
        
        let initializing = self.storage.initializing;
        let initialized = self.storage.initialized;

        // assert_with_error!(
        //     &env,
        //     initializing || initialized >= version,
        //     ContractError::InvalidInitialization
        // );

        if initializing || initialized >= version {
            return Err(ContractError::InvalidInitialization);
        }

        self.storage.initialized = version;
        self.storage.initializing = true;
     
        self.storage.initializing = false;

        env.events().publish((COUNTER, symbol_short!("reinitial")), version);

         Ok(())
    }

    // Modifier to protect an initialization function.
    pub fn only_initializing(&self) -> Result<(), ContractError> {
        self.check_initializing()
    }

    // Reverts if the contract is not in an initializing state.
    pub fn check_initializing(&self) -> Result<(), ContractError> {
        // assert_with_error!(
        //     &env,
        //     !self.is_initializing(),
        //     ContractError::NotInitializing
        // );

        if !self.is_initializing() {
            return Err(ContractError::NotInitializing);
        }
        Ok(())
    }

    // Locks the contract, preventing any future reinitialization.
    pub fn disable_initializers(&mut self, env: Env) -> Result<(), ContractError> {
        // assert_with_error!(
        //     &env,
        //     self.storage.initializing,
        //     ContractError::InvalidInitialization
        // );

        if self.storage.initializing {
            return Err(ContractError::InvalidInitialization);
        }

        if self.storage.initialized != u64::MAX {
            self.storage.initialized = u64::MAX;
            env.events().publish((COUNTER, symbol_short!("disable")), u64::MAX);
        }

        Ok(())
    }

    // Returns the highest version that has been initialized.
    pub fn get_initialized_version(&self) -> u64 {
        self.storage.initialized
    }

    // Returns true if the contract is currently initializing.
    pub fn is_initializing(&self) -> bool {
        self.storage.initializing
    }

    // Returns a pointer to the storage namespace.
    fn get_initializable_storage(&self) -> &InitializableStorage {
        &self.storage
    }
}

#[cfg(test)]
mod tests;