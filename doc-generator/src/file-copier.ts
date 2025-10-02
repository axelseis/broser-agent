/**
 * File copier for generated files to the client's public directory
 */

import * as fs from 'fs';
import * as path from 'path';
import { Metadata } from './types.js';

export class FileCopier {
  private outputDir: string;
  private targetDir: string;

  constructor(outputDir: string, targetDir: string) {
    this.outputDir = outputDir;
    this.targetDir = targetDir;
  }

  /**
   * Copies generated files to the client's public directory
   */
  async copyToPublic(): Promise<void> {
    console.log('📁 Copying files to public directory...');
    
    // Verificar que el directorio de salida existe
    await this.validateOutputDirectory();
    
    // Verificar que el directorio de destino existe
    await this.validateTargetDirectory();
    
    // Copiar embeddings.json
    await this.copyFile('embeddings.json');
    
    // Copiar metadata.json
    await this.copyFile('metadata.json');
    
    console.log('✅ Files copied successfully to public directory');
  }

  /**
   * Copia un archivo específico
   */
  private async copyFile(filename: string): Promise<void> {
    const sourcePath = path.join(this.outputDir, filename);
    const targetPath = path.join(this.targetDir, filename);
    
    try {
      await fs.promises.copyFile(sourcePath, targetPath);
      console.log(`📄 Copied ${filename}`);
    } catch (error) {
      console.error(`❌ Error copying ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Valida que el directorio de salida existe y tiene archivos
   */
  private async validateOutputDirectory(): Promise<void> {
    try {
      const stats = await fs.promises.stat(this.outputDir);
      if (!stats.isDirectory()) {
        throw new Error(`Output directory is not a directory: ${this.outputDir}`);
      }
      
      // Verificar que los archivos necesarios existen
      const requiredFiles = ['embeddings.json', 'metadata.json'];
      for (const file of requiredFiles) {
        const filePath = path.join(this.outputDir, file);
        try {
          await fs.promises.access(filePath, fs.constants.F_OK);
        } catch {
          throw new Error(`Required file not found: ${file}`);
        }
      }
      
      console.log('✅ Output directory validated');
    } catch (error) {
      console.error(`❌ Output directory validation failed:`, error);
      throw error;
    }
  }

  /**
   * Valida que el directorio de destino existe y es escribible
   */
  private async validateTargetDirectory(): Promise<void> {
    try {
      // Verificar si el directorio existe
      try {
        const stats = await fs.promises.stat(this.targetDir);
        if (!stats.isDirectory()) {
          throw new Error(`Target path exists but is not a directory: ${this.targetDir}`);
        }
      } catch (error) {
        // Si no existe, crearlo
        console.log(`📁 Creating target directory: ${this.targetDir}`);
        await fs.promises.mkdir(this.targetDir, { recursive: true });
      }
      
      // Verificar permisos de escritura
      await fs.promises.access(this.targetDir, fs.constants.W_OK);
      
      console.log('✅ Target directory validated');
    } catch (error) {
      console.error(`❌ Target directory validation failed:`, error);
      throw error;
    }
  }

  /**
   * Genera información sobre los archivos copiados
   */
  async getFileInfo(): Promise<{ embeddings: any; metadata: Metadata }> {
    const embeddingsPath = path.join(this.targetDir, 'embeddings.json');
    const metadataPath = path.join(this.targetDir, 'metadata.json');
    
    const embeddingsContent = await fs.promises.readFile(embeddingsPath, 'utf-8');
    const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
    
    return {
      embeddings: JSON.parse(embeddingsContent),
      metadata: JSON.parse(metadataContent)
    };
  }
}
